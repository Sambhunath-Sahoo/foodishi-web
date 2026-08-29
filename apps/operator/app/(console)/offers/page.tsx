"use client";

import * as React from "react";
import { toUserMessage } from "@repo/api-client";
import {
  Badge,
  Button,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  DataTableScroll,
  ErrorBanner,
  FilterChip,
  PageTitle,
  SEVERITY_LABEL,
  SeverityCell,
  TableFooter,
  Toolbar,
  type SeverityTier,
  type Tone,
} from "@repo/ui";
import { BoardSkeleton } from "../../../components/board-skeleton";
import { CouponDialog } from "../../../components/coupon-dialog";
import { MiniMeter } from "../../../components/mini-meter";
import { StageCards, type Stage } from "../../../components/stage-cards";
import { QueryState } from "../../../components/query-state";
import { RowAction, RowActions } from "../../../components/row-action";
import { DECK_PAGE, DECK_PANEL } from "../../../lib/deck";
import { formatCount, formatDateTime, formatMoney } from "../../../lib/format";
import {
  useCoupons,
  useCuisines,
  useRestaurantDirectory,
  useSetCouponActive,
} from "../../../lib/queries";
import type { CouponRead } from "../../../lib/api-types";

/** Within this share of the cap, a coupon is worth watching. */
const NEARLY_EXHAUSTED = 0.9;

/**
 * The outcome a code is in, which is also what the cards filter by.
 *
 * Deliberately four buckets for five labels: "expired", "switched off" and
 * "not started" are one card, because the operator's next move is the same for
 * all three — look at the row and decide whether it should be running. The
 * state column still names which one it is.
 */
type UsageKey = "live" | "nearly_gone" | "exhausted" | "dormant";

const ANY_USAGE = "any";

interface Usage {
  readonly key: UsageKey;
  readonly tone: Tone;
  readonly label: string;
  readonly tier: SeverityTier;
}

/**
 * Why a code is or is not usable today.
 *
 * Five outcomes rather than a boolean, because "switched off", "expired" and
 * "spent" need three different actions from the operator and a single "inactive"
 * chip would hide which one applies.
 */
function getUsage(coupon: CouponRead, nowMs: number | null): Usage {
  const limit = coupon.usage_limit_total;

  if (!coupon.is_active) {
    return {
      key: "dormant",
      tone: "mute",
      label: "Switched off",
      tier: 0,
    };
  }
  if (limit !== null && coupon.times_used >= limit) {
    return {
      key: "exhausted",
      tone: "crit",
      label: "Exhausted",
      tier: 3,
    };
  }
  if (nowMs !== null && nowMs > new Date(coupon.valid_until).getTime()) {
    return {
      key: "dormant",
      tone: "mute",
      label: "Expired",
      tier: 0,
    };
  }
  if (nowMs !== null && nowMs < new Date(coupon.valid_from).getTime()) {
    return {
      key: "dormant",
      tone: "cool",
      label: "Not started",
      tier: 0,
    };
  }
  if (limit !== null && coupon.times_used / limit >= NEARLY_EXHAUSTED) {
    return {
      key: "nearly_gone",
      tone: "warn",
      label: "Nearly gone",
      tier: 1,
    };
  }
  return {
    key: "live",
    tone: "ok",
    label: "Live",
    tier: 0,
  };
}

/** "30% off, capped at ₹200" / "₹60 off" — the offer in one phrase. */
function describeDiscount(coupon: CouponRead): string {
  if (coupon.discount_type === "flat") {
    return `${formatMoney(coupon.discount_value)} off`;
  }
  const percent = `${Number.parseFloat(coupon.discount_value).toFixed(0)}% off`;
  return coupon.max_discount_amount === null
    ? percent
    : `${percent}, capped at ${formatMoney(coupon.max_discount_amount)}`;
}

/** Share of the cap already spent. Uncapped codes sort last. */
function spentShare(coupon: CouponRead): number {
  return coupon.usage_limit_total === null
    ? 0
    : coupon.times_used / coupon.usage_limit_total;
}

/**
 * Coupons and platform-wide offers, which are one record with three scopes.
 *
 * The table is sorted by how much of each cap has been spent rather than by code
 * or by date, because that is the only ordering that puts the codes about to run
 * out — the ones that will start being refused at checkout tonight — at the top.
 */
export default function OffersPage(): React.JSX.Element {
  const coupons = useCoupons();
  const restaurants = useRestaurantDirectory();
  const cuisines = useCuisines();
  const setActive = useSetCouponActive();

  const [scope, setScope] = React.useState<UsageKey | typeof ANY_USAGE>(ANY_USAGE);
  const [editing, setEditing] = React.useState<CouponRead | null>(null);
  const [isCreating, setIsCreating] = React.useState(false);

  // Expiry is a wall-clock judgement, so it waits for the client to have one.
  const [nowMs, setNowMs] = React.useState<number | null>(null);
  React.useEffect(() => {
    setNowMs(Date.now());
  }, []);

  const cuisineNames = React.useMemo(
    () => new Map((cuisines.data ?? []).map((row) => [row.id, row.name])),
    [cuisines.data],
  );

  /** "Whole platform", "Paradise Biryani House", "Biryani". */
  const describeScope = React.useCallback(
    (coupon: CouponRead): string => {
      if (coupon.scope === "restaurant") {
        return coupon.restaurant_id === null
          ? "One kitchen"
          : (restaurants.data?.get(coupon.restaurant_id)?.name ??
              `Restaurant ${String(coupon.restaurant_id)}`);
      }
      if (coupon.scope === "cuisine") {
        return coupon.cuisine_id === null
          ? "One cuisine"
          : (cuisineNames.get(coupon.cuisine_id) ??
              `Cuisine ${String(coupon.cuisine_id)}`);
      }
      return "Whole platform";
    },
    [cuisineNames, restaurants.data],
  );

  return (
    <div className={DECK_PAGE}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageTitle subtitle="Every code on the platform, and how much of its cap has been spent.">
          Offers &amp; coupons
        </PageTitle>
        <Button size="sm" onClick={() => setIsCreating(true)}>
          New coupon
        </Button>
      </div>

      {setActive.error === null ? null : (
        <ErrorBanner
          title="That code could not be switched"
          message={toUserMessage(setActive.error)}
        />
      )}

      <QueryState
        query={coupons}
        errorTitle="Coupons could not load"
        emptyTitle="No coupons configured"
        emptyDetail="Create a code and it appears here with its redemption count and cap."
        isEmpty={(page) => page.items.length === 0}
        skeleton={
          <BoardSkeleton label="Loading coupons" note="Reading every code…" />
        }
      >
        {(page) => {
          const all = page.items
            .map((coupon) => ({ coupon, usage: getUsage(coupon, nowMs) }))
            .sort((left, right) => spentShare(right.coupon) - spentShare(left.coupon));

          const rows = all.filter(
            ({ usage }) => scope === ANY_USAGE || usage.key === scope,
          );

          const tally = (key: UsageKey): number =>
            all.filter((row) => row.usage.key === key).length;
          const redemptions = all.reduce(
            (sum, row) => sum + row.coupon.times_used,
            0,
          );

          /**
           * Counted over every code, never over `rows`.
           *
           * A card row fed from the filtered list would zero out the three
           * cards the reader is not looking at — the exhausted count has to be
           * loud precisely when the reader is somewhere else.
           */
          const stages: readonly Stage<UsageKey>[] = [
            {
              value: "live",
              label: "Live",
              caption: "Working normally at checkout",
              count: tally("live"),
              chip: <Badge tone="ok">Redeemable</Badge>,
            },
            {
              value: "nearly_gone",
              label: "Nearly gone",
              caption: "Within a tenth of the cap",
              count: tally("nearly_gone"),
              tone: "warn",
              chip: <Badge tone="warn">Watch</Badge>,
            },
            {
              value: "exhausted",
              label: "Exhausted",
              caption: "Refused at checkout from now on",
              count: tally("exhausted"),
              tone: "crit",
              chip: <Badge tone="crit">At cap</Badge>,
            },
            {
              value: "dormant",
              label: "Not usable",
              caption: "Expired, switched off or not started",
              count: tally("dormant"),
              chip: <Badge tone="mute">Idle</Badge>,
            },
          ];

          return (
            <>
              <StageCards
                ariaLabel="Which codes to show"
                stages={stages}
                active={
                  scope === ANY_USAGE
                    ? stages.map((stage) => stage.value)
                    : [scope]
                }
                onSelect={(next) =>
                  setScope((current) => (current === next ? ANY_USAGE : next))
                }
                note={
                  <>
                    {formatCount(all.length)} codes on the platform ·{" "}
                    {formatCount(redemptions)} redemptions across all of them ·
                    press a card again to clear it
                  </>
                }
              />

              <Toolbar ariaLabel="Coupon filters">
                <FilterChip
                  label="Every scope"
                  tone="accent"
                  title="Platform-wide offers, one kitchen's own codes and cuisine promotions are one record with a different scope. The 'Applies to' column says which."
                />
              </Toolbar>

              <DataTableScroll
                className={DECK_PANEL}
                footer={
                  <TableFooter
                    shown={rows.length}
                    total={all.length}
                    noun="coupons"
                    sortedBy="share of the cap already spent"
                    extra={`${formatCount(redemptions)} redemptions in total`}
                  />
                }
              >
                <DataTable aria-label="Coupon redemptions against their caps">
                  <DataTableHead>
                    <tr>
                      <DataTableHeaderCell className="pl-4">Code</DataTableHeaderCell>
                      <DataTableHeaderCell>Offer</DataTableHeaderCell>
                      <DataTableHeaderCell>Applies to</DataTableHeaderCell>
                      <DataTableHeaderCell numeric>Min order</DataTableHeaderCell>
                      <DataTableHeaderCell className="w-[210px]">
                        Redemptions
                      </DataTableHeaderCell>
                      <DataTableHeaderCell>State</DataTableHeaderCell>
                      <DataTableHeaderCell>Valid until</DataTableHeaderCell>
                      <DataTableHeaderCell numeric>Change it</DataTableHeaderCell>
                    </tr>
                  </DataTableHead>
                  <DataTableBody>
                    {rows.map(({ coupon, usage }) => {
                      const isBusy =
                        setActive.isPending &&
                        setActive.variables?.couponId === coupon.id;

                      return (
                        <DataTableRow key={coupon.id}>
                          <SeverityCell
                            tier={usage.tier}
                            mono
                            title={
                              usage.tier === 0 ? undefined : SEVERITY_LABEL[usage.tier]
                            }
                            className="font-medium text-ink"
                          >
                            {coupon.code}
                          </SeverityCell>
                          <DataTableCell className="max-w-[210px] text-ink-2">
                            {describeDiscount(coupon)}
                          </DataTableCell>
                          <DataTableCell className="max-w-[170px] text-ink-2">
                            <span className="truncate">{describeScope(coupon)}</span>
                          </DataTableCell>
                          <DataTableCell numeric>
                            {formatMoney(coupon.min_order_value)}
                          </DataTableCell>
                          <DataTableCell>
                            {coupon.usage_limit_total === null ? (
                              <span className="font-mono text-[11px] tabular-nums text-ink-3">
                                {formatCount(coupon.times_used)} used · no cap
                              </span>
                            ) : (
                              <MiniMeter
                                ariaLabel={`${coupon.code} redemptions`}
                                value={coupon.times_used}
                                max={coupon.usage_limit_total}
                                valueLabel={`${formatCount(coupon.times_used)} / ${formatCount(
                                  coupon.usage_limit_total,
                                )}`}
                                tone={usage.tone}
                              />
                            )}
                          </DataTableCell>
                          <DataTableCell>
                            <Badge tone={usage.tone}>{usage.label}</Badge>
                          </DataTableCell>
                          <DataTableCell mono>
                            {formatDateTime(coupon.valid_until)}
                          </DataTableCell>
                          <DataTableCell numeric>
                            <RowActions>
                              <RowAction
                                tone="accent"
                                onClick={() => setEditing(coupon)}
                                title="Change what this code takes off, where it applies and how long it runs."
                                ariaLabel={`Edit ${coupon.code}`}
                              >
                                Edit
                              </RowAction>
                              <RowAction
                                tone={coupon.is_active ? "danger" : "default"}
                                isPending={isBusy}
                                onClick={() =>
                                  setActive.mutate({
                                    couponId: coupon.id,
                                    isActive: !coupon.is_active,
                                  })
                                }
                                title={
                                  coupon.is_active
                                    ? "Stop this code working at checkout. Its redemption count is kept."
                                    : "Let customers use this code again."
                                }
                                ariaLabel={`${coupon.is_active ? "Switch off" : "Switch on"} ${coupon.code}`}
                              >
                                {coupon.is_active ? "Switch off" : "Switch on"}
                              </RowAction>
                            </RowActions>
                          </DataTableCell>
                        </DataTableRow>
                      );
                    })}
                  </DataTableBody>
                </DataTable>
              </DataTableScroll>
            </>
          );
        }}
      </QueryState>

      <CouponDialog
        open={isCreating || editing !== null}
        coupon={editing}
        onClose={() => {
          setIsCreating(false);
          setEditing(null);
        }}
      />
    </div>
  );
}
