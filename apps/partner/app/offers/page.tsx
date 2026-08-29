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
  Dialog,
  PageTitle,
  SegmentedControl,
  Stat,
  StatRail,
  TableFooter,
  UsageBar,
} from "@repo/ui";
import { CouponDialog } from "./coupon-dialog";
import { OfferDialog } from "./offer-dialog";
import {
  STANDING_LABELS,
  STANDING_TONES,
  describeDiscount,
  readStanding,
} from "./discount-shape";
import { KitchenGate } from "../_components/kitchen-gate";
import { CardSkeletons, EmptyCard, LoadError, RefusedNote } from "../_components/states";
import { formatCount, formatDay, formatMoney, pluralise } from "../_lib/format";
import { ROLE_LABELS } from "../../lib/permissions";
import { useMenu } from "../../lib/queries/menu";
import {
  useCoupons,
  useDeleteCoupon,
  useDeleteOffer,
  useOffers,
  useSetCouponActive,
  useSetOfferActive,
} from "../../lib/queries/offers";
import type { ReadyKitchen } from "../../lib/kitchen";
import type { Coupon, Offer } from "../../lib/types";

type Tab = "offers" | "coupons";

/** "21 Aug → 10 Sep" · "21 Aug → open-ended". */
function describeWindow(startsAt: string, endsAt: string | null): string {
  return `${formatDay(startsAt)} → ${endsAt === null ? "open-ended" : formatDay(endsAt)}`;
}

function OffersTable({
  kitchen,
  now,
}: {
  readonly kitchen: ReadyKitchen;
  readonly now: number;
}): React.JSX.Element {
  const [editing, setEditing] = React.useState<Offer | null>(null);
  const [isCreating, setIsCreating] = React.useState(false);
  const [deleting, setDeleting] = React.useState<Offer | null>(null);

  const offers = useOffers(kitchen);
  const menu = useMenu(kitchen);
  const setActive = useSetOfferActive(kitchen);
  const remove = useDeleteOffer(kitchen);

  const canManage = kitchen.can("offers.manage");
  const rows = offers.data ?? [];
  const live = rows.filter(
    (offer) => readStanding(offer.is_active, offer.starts_at, offer.ends_at, now) === "live",
  );
  const redemptions = rows.reduce((total, offer) => total + offer.redemption_count, 0);

  return (
    <div className="flex flex-col gap-4">
      {canManage ? (
        <div className="flex justify-end">
          <Button className="min-h-11" onClick={() => setIsCreating(true)}>
            Create an offer
          </Button>
        </div>
      ) : (
        <RefusedNote
          title="Offers are a manager's to change"
          detail={`You are signed in as ${ROLE_LABELS[kitchen.role].toLowerCase()}. What the restaurant charges is not part of a shift.`}
        />
      )}

      {offers.isPending ? <CardSkeletons count={2} label="Loading offers" /> : null}

      {offers.error !== null ? (
        <LoadError
          error={offers.error}
          title="Could not load offers"
          refusedTitle="Offers are not on the live API yet"
          onRetry={() => {
            void offers.refetch();
          }}
        />
      ) : null}

      {offers.data !== undefined ? (
        <>
          <StatRail ariaLabel="Offers">
            <Stat
              label="Live now"
              value={formatCount(live.length)}
              caption={`${pluralise(rows.length, "offer", "offers")} in total`}
              hint="Switched on, started, and not yet ended. An offer can be switched on and still not be live."
            />
            <Stat
              label="Times used"
              value={formatCount(redemptions)}
              caption="Across every offer, ever"
              hint="How many orders have had one of these applied. Counted by the platform — not editable here."
            />
          </StatRail>

          {rows.length === 0 ? (
            <EmptyCard
              title="No offers yet"
              detail="An offer applies itself: a customer sees it on this restaurant and gets it without typing anything. Create one and it appears the moment it starts."
            />
          ) : (
            <DataTableScroll
              footer={
                <TableFooter
                  shown={rows.length}
                  total={rows.length}
                  noun="offers"
                  sortedBy="live first, then most recently started"
                />
              }
            >
              <DataTable>
                <DataTableHead>
                  <DataTableRow>
                    <DataTableHeaderCell>Offer</DataTableHeaderCell>
                    <DataTableHeaderCell>Takes off</DataTableHeaderCell>
                    <DataTableHeaderCell numeric>Minimum</DataTableHeaderCell>
                    <DataTableHeaderCell>Runs</DataTableHeaderCell>
                    <DataTableHeaderCell numeric>Used</DataTableHeaderCell>
                    <DataTableHeaderCell>Standing</DataTableHeaderCell>
                    {canManage ? (
                      <DataTableHeaderCell className="text-right">
                        Change
                      </DataTableHeaderCell>
                    ) : null}
                  </DataTableRow>
                </DataTableHead>
                <DataTableBody>
                  {rows.map((offer) => {
                    const standing = readStanding(
                      offer.is_active,
                      offer.starts_at,
                      offer.ends_at,
                      now,
                    );
                    return (
                      <DataTableRow key={offer.id} className="h-auto min-h-[52px]">
                        <DataTableCell wrap className="max-w-[260px]">
                          <span className="block text-[15px] leading-snug text-ink">
                            {offer.title}
                          </span>
                          <span className="mt-0.5 block text-[12px] leading-snug text-ink-3">
                            {offer.menu_item_ids === null
                              ? "The whole menu"
                              : pluralise(offer.menu_item_ids.length, "dish", "dishes")}
                          </span>
                        </DataTableCell>
                        <DataTableCell className="text-ink-2">
                          {describeDiscount(offer.kind, offer.value, offer.max_discount)}
                        </DataTableCell>
                        <DataTableCell numeric mono className="text-ink-2">
                          {formatMoney(offer.min_order_value)}
                        </DataTableCell>
                        <DataTableCell mono className="text-[13px] text-ink-3">
                          {describeWindow(offer.starts_at, offer.ends_at)}
                        </DataTableCell>
                        <DataTableCell numeric mono className="text-ink">
                          {formatCount(offer.redemption_count)}
                        </DataTableCell>
                        <DataTableCell>
                          <Badge tone={STANDING_TONES[standing]}>
                            {STANDING_LABELS[standing]}
                          </Badge>
                        </DataTableCell>
                        {canManage ? (
                          <DataTableCell className="py-1.5 text-right">
                            <span className="flex justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                className="min-h-11"
                                onClick={() =>
                                  setActive.mutate({
                                    offerId: offer.id,
                                    isActive: !offer.is_active,
                                  })
                                }
                              >
                                {offer.is_active ? "Switch off" : "Switch on"}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="min-h-11"
                                onClick={() => setEditing(offer)}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="min-h-11 text-crit hover:bg-crit-soft"
                                onClick={() => setDeleting(offer)}
                              >
                                Delete
                              </Button>
                            </span>
                          </DataTableCell>
                        ) : null}
                      </DataTableRow>
                    );
                  })}
                </DataTableBody>
              </DataTable>
            </DataTableScroll>
          )}

          {setActive.error !== null ? (
            <p role="alert" className="text-[13px] leading-snug text-crit">
              {toUserMessage(setActive.error)}
            </p>
          ) : null}
        </>
      ) : null}

      {isCreating ? (
        <OfferDialog
          kitchen={kitchen}
          categories={menu.data ?? []}
          offer={null}
          onClose={() => setIsCreating(false)}
        />
      ) : null}
      {editing !== null ? (
        <OfferDialog
          kitchen={kitchen}
          categories={menu.data ?? []}
          offer={editing}
          onClose={() => setEditing(null)}
        />
      ) : null}
      {deleting !== null ? (
        <Dialog
          open
          onOpenChange={() => setDeleting(null)}
          title={`Delete ${deleting.title}?`}
          description="Switching it off stops it applying immediately and keeps the numbers. Deleting is only for an offer that was never used."
          footer={
            <>
              <Button variant="ghost" className="min-h-11" onClick={() => setDeleting(null)}>
                Keep it
              </Button>
              {/* Disabled when the dialog's own body says deletion is
                  impossible. The copy stated it as a fact and the red button was
                  offered anyway, so the tap round-tripped and came back as a red
                  error repeating what the dialog had already said — which trains
                  people to ignore confirmation copy. */}
              <Button
                variant="danger"
                className="min-h-11"
                disabled={deleting.redemption_count > 0}
                isPending={remove.isPending}
                pendingLabel="Deleting…"
                onClick={() =>
                  remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })
                }
              >
                Delete it
              </Button>
            </>
          }
        >
          <p className="leading-snug">
            {deleting.redemption_count > 0
              ? `This offer has been used on ${formatCount(deleting.redemption_count)} orders, so it cannot be deleted — those orders keep their link to it. Switch it off instead.`
              : "Nobody has used this offer, so nothing is lost."}
          </p>
          {remove.error !== null ? (
            <p role="alert" className="mt-2 text-[13px] leading-snug text-crit">
              {toUserMessage(remove.error)}
            </p>
          ) : null}
        </Dialog>
      ) : null}
    </div>
  );
}

function CouponsTable({
  kitchen,
  now,
}: {
  readonly kitchen: ReadyKitchen;
  readonly now: number;
}): React.JSX.Element {
  const [editing, setEditing] = React.useState<Coupon | null>(null);
  const [isCreating, setIsCreating] = React.useState(false);
  const [deleting, setDeleting] = React.useState<Coupon | null>(null);

  const coupons = useCoupons(kitchen);
  const setActive = useSetCouponActive(kitchen);
  const remove = useDeleteCoupon(kitchen);

  const canManage = kitchen.can("offers.manage");
  const rows = coupons.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      {canManage ? (
        <div className="flex justify-end">
          <Button className="min-h-11" onClick={() => setIsCreating(true)}>
            Create a coupon
          </Button>
        </div>
      ) : (
        <RefusedNote
          title="Coupons are a manager's to change"
          detail={`You are signed in as ${ROLE_LABELS[kitchen.role].toLowerCase()}.`}
        />
      )}

      {coupons.isPending ? <CardSkeletons count={2} label="Loading coupons" /> : null}

      {coupons.error !== null ? (
        <LoadError
          error={coupons.error}
          title="Could not load coupons"
          refusedTitle="Coupons are not on the live API yet"
          onRetry={() => {
            void coupons.refetch();
          }}
        />
      ) : null}

      {coupons.data !== undefined ? (
        rows.length === 0 ? (
          <EmptyCard
            title="No coupons yet"
            detail="A coupon is a code a customer types at checkout, so it carries limits an offer does not. Create one and hand the code out."
          />
        ) : (
          <DataTableScroll
            footer={
              <TableFooter
                shown={rows.length}
                total={rows.length}
                noun="coupons"
                sortedBy="switched on first, then by code"
              />
            }
          >
            <DataTable>
              <DataTableHead>
                <DataTableRow>
                  <DataTableHeaderCell>Code</DataTableHeaderCell>
                  <DataTableHeaderCell>Takes off</DataTableHeaderCell>
                  <DataTableHeaderCell numeric>Minimum</DataTableHeaderCell>
                  <DataTableHeaderCell>Runs</DataTableHeaderCell>
                  <DataTableHeaderCell className="w-[180px]">Used</DataTableHeaderCell>
                  <DataTableHeaderCell>Standing</DataTableHeaderCell>
                  {canManage ? (
                    <DataTableHeaderCell className="text-right">Change</DataTableHeaderCell>
                  ) : null}
                </DataTableRow>
              </DataTableHead>
              <DataTableBody>
                {rows.map((coupon) => {
                  const standing = readStanding(
                    coupon.is_active,
                    coupon.starts_at,
                    coupon.ends_at,
                    now,
                  );
                  return (
                    <DataTableRow key={coupon.id} className="h-auto min-h-[52px]">
                      <DataTableCell mono className="text-[15px] text-ink">
                        {coupon.code}
                        <span className="mt-0.5 block font-sans text-[12px] text-ink-3">
                          {coupon.per_user_limit} per customer
                        </span>
                      </DataTableCell>
                      <DataTableCell className="text-ink-2">
                        {describeDiscount(coupon.kind, coupon.value, coupon.max_discount)}
                      </DataTableCell>
                      <DataTableCell numeric mono className="text-ink-2">
                        {formatMoney(coupon.min_order_value)}
                      </DataTableCell>
                      <DataTableCell mono className="text-[13px] text-ink-3">
                        {describeWindow(coupon.starts_at, coupon.ends_at)}
                      </DataTableCell>
                      <DataTableCell className="py-2">
                        {/* A bar only where there is a ceiling to be near. An
                            unlimited coupon has no fraction to draw. */}
                        {coupon.usage_limit === null ? (
                          <span className="font-mono text-[13px] tabular-nums text-ink-2">
                            {formatCount(coupon.redemption_count)} · no limit
                          </span>
                        ) : (
                          <UsageBar
                            label="Used"
                            value={coupon.redemption_count}
                            max={coupon.usage_limit}
                            valueLabel={`${formatCount(coupon.redemption_count)} / ${formatCount(coupon.usage_limit)}`}
                            tone={
                              coupon.redemption_count >= coupon.usage_limit ? "crit" : "accent"
                            }
                          />
                        )}
                      </DataTableCell>
                      <DataTableCell>
                        <Badge tone={STANDING_TONES[standing]}>
                          {STANDING_LABELS[standing]}
                        </Badge>
                      </DataTableCell>
                      {canManage ? (
                        <DataTableCell className="py-1.5 text-right">
                          <span className="flex justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              className="min-h-11"
                              onClick={() =>
                                setActive.mutate({
                                  couponId: coupon.id,
                                  isActive: !coupon.is_active,
                                })
                              }
                            >
                              {coupon.is_active ? "Switch off" : "Switch on"}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="min-h-11"
                              onClick={() => setEditing(coupon)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="min-h-11 text-crit hover:bg-crit-soft"
                              onClick={() => setDeleting(coupon)}
                            >
                              Delete
                            </Button>
                          </span>
                        </DataTableCell>
                      ) : null}
                    </DataTableRow>
                  );
                })}
              </DataTableBody>
            </DataTable>
          </DataTableScroll>
        )
      ) : null}

      {isCreating ? (
        <CouponDialog kitchen={kitchen} coupon={null} onClose={() => setIsCreating(false)} />
      ) : null}
      {editing !== null ? (
        <CouponDialog kitchen={kitchen} coupon={editing} onClose={() => setEditing(null)} />
      ) : null}
      {deleting !== null ? (
        <Dialog
          open
          onOpenChange={() => setDeleting(null)}
          title={`Delete ${deleting.code}?`}
          description="Switching it off stops it working immediately and keeps the numbers. Deleting is only for a code nobody has used."
          footer={
            <>
              <Button variant="ghost" className="min-h-11" onClick={() => setDeleting(null)}>
                Keep it
              </Button>
              {/* Same doomed-red-button defect as the offer dialog above: the
                  description says deleting is "only for a code nobody has used"
                  and the source refuses a used one, so the button could only
                  round-trip into an error repeating the copy. */}
              <Button
                variant="danger"
                className="min-h-11"
                disabled={deleting.redemption_count > 0}
                isPending={remove.isPending}
                pendingLabel="Deleting…"
                onClick={() =>
                  remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })
                }
              >
                Delete {deleting.code}
              </Button>
            </>
          }
        >
          <p className="leading-snug">
            {deleting.redemption_count > 0
              ? `${deleting.code} has been used ${formatCount(deleting.redemption_count)} times, so it cannot be deleted — those orders keep their link to it. Switch it off instead and it stops working immediately.`
              : "Nobody has used this code, so nothing is lost."}
          </p>
          {remove.error !== null ? (
            <p role="alert" className="mt-2 text-[13px] leading-snug text-crit">
              {toUserMessage(remove.error)}
            </p>
          ) : null}
        </Dialog>
      ) : null}
    </div>
  );
}

const TABS: readonly { readonly value: Tab; readonly label: string }[] = [
  { value: "offers", label: "Offers" },
  { value: "coupons", label: "Coupons" },
];

/**
 * Two ways to discount, on one screen, because a manager deciding to run a
 * promotion is choosing between them.
 *
 * The difference is stated everywhere it matters: an offer applies itself and a
 * coupon has to be typed, which is why only the coupon carries usage limits.
 */
export default function OffersPage(): React.JSX.Element {
  const [tab, setTab] = React.useState<Tab>("offers");
  const now = React.useMemo(() => Date.now(), []);

  return (
    <div className="flex flex-col gap-4">
      <PageTitle subtitle="An offer applies itself. A coupon has to be typed. Both come out of this restaurant's own margin, not the platform's.">
        Offers
      </PageTitle>

      <KitchenGate loadingCards={2} loadingLabel="Loading offers" requires="offers.view">
        {(kitchen) => (
          <div className="flex flex-col gap-4">
            <SegmentedControl
              ariaLabel="Offers or coupons"
              options={TABS}
              value={tab}
              onValueChange={setTab}
            />
            {tab === "offers" ? (
              <OffersTable kitchen={kitchen} now={now} />
            ) : (
              <CouponsTable kitchen={kitchen} now={now} />
            )}
          </div>
        )}
      </KitchenGate>
    </div>
  );
}
