"use client";

import * as React from "react";
import { toUserMessage } from "@repo/api-client";
import {
  Badge,
  Button,
  Card,
  CardBody,
  ErrorBanner,
  PageTitle,
  Skeleton,
} from "@repo/ui";
import { QueryState } from "../../../components/query-state";
import { CommissionSettingsCard } from "../../../components/settings/commission-settings";
import {
  DeliverySettingsCard,
  OrderRuleSettingsCard,
  TaxSettingsCard,
} from "../../../components/settings/other-settings";
import { DECK_PAGE } from "../../../lib/deck";
import {
  useResetSettings,
  useRestaurants,
  useSaveSettings,
  useSettings,
} from "../../../lib/queries";
import type { PlatformSettings } from "../../../lib/services/types";

/**
 * What the platform charges, keeps and refuses.
 *
 * A draft-and-save screen rather than a live one. Every number here is wired
 * into arithmetic somewhere else — the commission rate decides the ledger and
 * two reports, the refund promise decides which refunds count as breached and
 * therefore the alarm on the overview — and a field that saved on every
 * keystroke would recompute all of that halfway through somebody typing "18".
 *
 * The rules are not enforced here. `lib/services` refuses a bad combination and
 * says why, in the sentence the operator needs: "free delivery has to kick in
 * above the fee itself, or every order gets it free". A form that validated the
 * same rules a second time would eventually disagree with the first.
 */
export default function SettingsPage(): React.JSX.Element {
  const settings = useSettings();
  const restaurants = useRestaurants();
  const save = useSaveSettings();
  const reset = useResetSettings();

  const [draft, setDraft] = React.useState<PlatformSettings | null>(null);
  const [saved, setSaved] = React.useState(false);

  // The draft is seeded once from the saved settings, and again whenever they
  // change underneath — which happens exactly on save and on reset.
  const settled = settings.data;
  React.useEffect(() => {
    if (settled !== undefined) setDraft(settled);
  }, [settled]);

  const isDirty =
    draft !== null &&
    settled !== undefined &&
    JSON.stringify(draft) !== JSON.stringify(settled);

  const pending = save.isPending || reset.isPending;
  const error = save.error ?? reset.error;

  const commit = React.useCallback(() => {
    if (draft === null) return;
    setSaved(false);
    save.mutate(draft, { onSuccess: () => setSaved(true) });
  }, [draft, save]);

  const discard = React.useCallback(() => {
    setSaved(false);
    if (settled !== undefined) setDraft(settled);
  }, [settled]);

  const restore = React.useCallback(() => {
    if (draft === null) return;
    setSaved(false);
    reset.mutate(draft, { onSuccess: () => setSaved(true) });
  }, [draft, reset]);

  return (
    <div className={DECK_PAGE}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageTitle subtitle="Delivery charges, commission, tax and the rules an order has to obey.">
          Platform settings
        </PageTitle>
        <div className="flex items-center gap-3">
          {isDirty ? (
            <Badge tone="warn">Unsaved changes</Badge>
          ) : saved ? (
            <Badge tone="ok">Saved</Badge>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            onClick={discard}
            disabled={!isDirty || pending}
          >
            Discard
          </Button>
          <Button
            size="sm"
            onClick={commit}
            isPending={save.isPending}
            pendingLabel="Saving…"
            disabled={!isDirty || pending}
          >
            Save changes
          </Button>
        </div>
      </div>

      {error === null ? null : (
        <ErrorBanner
          title="These settings were not saved"
          message={toUserMessage(error)}
        />
      )}

      <QueryState
        query={settings}
        errorTitle="Platform settings could not load"
        emptyTitle="No platform settings configured"
        emptyDetail="Delivery charges, commission, tax and the order rules all live here."
        skeleton={
          <div className="flex flex-col gap-3">
            <Skeleton className="h-[220px] w-full" label="Loading the settings" />
            <Skeleton className="h-[220px] w-full" label="" />
          </div>
        }
      >
        {() =>
          draft === null ? (
            <Skeleton className="h-[220px] w-full" label="Loading the settings" />
          ) : (
            // The one page in the console that scrolls as a document: it is a
            // form, not a board, and a form that made its own fields scroll
            // inside a frame would hide the save button from half of them.
            //
            // The scroller is a plain block and the cards stack inside it. As
            // flex children they would each be allowed to shrink, and a card
            // with `overflow-hidden` that shrinks does not scroll — it clips,
            // which cost this page four of its seven delivery fields.
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="flex flex-col gap-3 pb-4">
                <DeliverySettingsCard
                  value={draft.delivery}
                  onChange={(delivery) => setDraft({ ...draft, delivery })}
                />
                <CommissionSettingsCard
                  value={draft.commission}
                  onChange={(commission) => setDraft({ ...draft, commission })}
                  restaurants={restaurants.data?.items ?? []}
                />
                <TaxSettingsCard
                  value={draft.tax}
                  onChange={(tax) => setDraft({ ...draft, tax })}
                />
                <OrderRuleSettingsCard
                  value={draft.order_rules}
                  onChange={(orderRules) =>
                    setDraft({ ...draft, order_rules: orderRules })
                  }
                />

                <Card stripe="mute">
                  <CardBody className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div>
                      <p className="font-sans text-[13px] font-medium text-ink">
                        Back to what the platform ships
                      </p>
                      <p className="font-sans text-[12px] text-ink-3">
                        Throws away every change made here and restores the shipped
                        defaults. Orders already placed keep the rules frozen onto
                        them.
                      </p>
                    </div>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={restore}
                      isPending={reset.isPending}
                      pendingLabel="Restoring…"
                      disabled={pending}
                    >
                      Restore defaults
                    </Button>
                  </CardBody>
                </Card>
              </div>
            </div>
          )
        }
      </QueryState>
    </div>
  );
}
