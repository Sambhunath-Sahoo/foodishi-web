"use client";

import * as React from "react";
import { toUserMessage } from "@repo/api-client";
import {
  Button,
  Dialog,
  ErrorBanner,
  Field,
  Input,
  Select,
  Skeleton,
} from "@repo/ui";
import {
  useDeliveryPartners,
  useMarkDeliveryFailed,
  useReassignDelivery,
} from "../lib/queries";
import { formatOrderRef } from "../lib/format";
import type { DeliveryBoardRow } from "../lib/services/types";

export type DeliveryAction = "reassign" | "fail";

export interface DeliveryActionDialogProps {
  /** The row being acted on, or null when nothing is open. */
  readonly row: DeliveryBoardRow | null;
  readonly action: DeliveryAction;
  readonly onClose: () => void;
}

/** Reasons a ride actually fails, so nobody types "failed" in the box. */
const FAILURE_REASONS: readonly string[] = [
  "Customer unreachable at the door",
  "Address could not be found",
  "Rider had an accident or breakdown",
  "Customer refused the order",
  "Restaurant handed over the wrong order",
];

const OTHER = "__other";

/**
 * The two decisions a stalled delivery needs, each behind a confirmation.
 *
 * Both state the consequence before the tap (DESIGN.md copy rules) and both
 * carry the real order on the face of the dialog, because "are you sure" with no
 * order number on it is a question nobody can answer honestly at 21:40 on a
 * Friday.
 *
 * Reassigning sends the ride back to the pass under a new rider — it does not
 * mark it picked up, and the dialog says so. Failing it needs a reason, because
 * that reason is what support reads back to the customer; the list above is
 * there so the reasons stay comparable instead of becoming free text nobody can
 * count.
 */
export function DeliveryActionDialog({
  row,
  action,
  onClose,
}: DeliveryActionDialogProps): React.JSX.Element {
  const partners = useDeliveryPartners();
  const reassign = useReassignDelivery();
  const markFailed = useMarkDeliveryFailed();

  const [partnerId, setPartnerId] = React.useState("");
  const [reasonChoice, setReasonChoice] = React.useState<string>(
    FAILURE_REASONS[0] ?? OTHER,
  );
  const [otherReason, setOtherReason] = React.useState("");

  // Every open starts clean: a partner chosen for the last ride must never be
  // the default for the next one.
  React.useEffect(() => {
    if (row === null) return;
    setPartnerId("");
    setReasonChoice(FAILURE_REASONS[0] ?? OTHER);
    setOtherReason("");
    reassign.reset();
    markFailed.reset();
    // The mutations' identities are stable; resetting on a new row is the point.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row?.delivery.id, action]);

  const pending = reassign.isPending || markFailed.isPending;
  const error = reassign.error ?? markFailed.error;

  const available = React.useMemo(
    () =>
      (partners.data ?? []).filter(
        (partner) => partner.id !== row?.delivery.partner_id,
      ),
    [partners.data, row?.delivery.partner_id],
  );

  const partnerOptions = React.useMemo(
    () => [
      { value: "", label: "Choose a rider…" },
      ...available.map((partner) => ({
        value: String(partner.id),
        label: `${partner.name} · ${partner.vehicle_type.replace("_", " ")}${
          partner.is_available ? "" : " · on another run"
        }`,
      })),
    ],
    [available],
  );

  const reason = reasonChoice === OTHER ? otherReason : reasonChoice;

  const submit = React.useCallback((): void => {
    if (row === null) return;
    if (action === "reassign") {
      const id = Number.parseInt(partnerId, 10);
      if (!Number.isFinite(id)) return;
      reassign.mutate(
        { deliveryId: row.delivery.id, partnerId: id },
        { onSuccess: onClose },
      );
      return;
    }
    markFailed.mutate(
      { deliveryId: row.delivery.id, reason },
      { onSuccess: onClose },
    );
  }, [action, markFailed, onClose, partnerId, reassign, reason, row]);

  const orderRef = row === null ? "" : formatOrderRef(row.order.id);
  const rider = row?.delivery.partner.name ?? "";

  return (
    <Dialog
      open={row !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={action === "reassign" ? `Reassign ${orderRef}` : `Fail ${orderRef}`}
      description={
        action === "reassign"
          ? `${rider} is on this ride now. A new rider starts from the kitchen — the order goes back to waiting for pickup, and the customer's promise does not move.`
          : `The customer does not get this order. ${rider} is taken off it and the reason below is what support reads back to them.`
      }
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Leave it alone
          </Button>
          <Button
            variant={action === "fail" ? "danger" : "primary"}
            onClick={submit}
            isPending={pending}
            pendingLabel={action === "reassign" ? "Reassigning…" : "Recording…"}
            disabled={
              action === "reassign" ? partnerId === "" : reason.trim() === ""
            }
          >
            {action === "reassign" ? "Reassign the ride" : "Mark it failed"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error === null ? null : (
          <ErrorBanner
            title={
              action === "reassign"
                ? "The ride could not be reassigned"
                : "That could not be recorded"
            }
            message={toUserMessage(error)}
          />
        )}

        {action === "reassign" ? (
          partners.isPending ? (
            <Skeleton className="h-10 w-full" label="Loading the riders" />
          ) : (
            <Field
              label="New rider"
              htmlFor="reassign-partner"
              hint="Riders already out on another run are marked. They can still be given this one."
            >
              <Select
                id="reassign-partner"
                options={partnerOptions}
                value={partnerId}
                onChange={(event) => setPartnerId(event.target.value)}
              />
            </Field>
          )
        ) : (
          <>
            <Field label="What went wrong" htmlFor="fail-reason">
              <Select
                id="fail-reason"
                options={[
                  ...FAILURE_REASONS.map((value) => ({ value, label: value })),
                  { value: OTHER, label: "Something else…" },
                ]}
                value={reasonChoice}
                onChange={(event) => setReasonChoice(event.target.value)}
              />
            </Field>
            {reasonChoice === OTHER ? (
              <Field
                label="In your own words"
                htmlFor="fail-other"
                hint="One sentence. It is read by whoever picks up the customer's call."
              >
                <Input
                  id="fail-other"
                  value={otherReason}
                  autoFocus
                  onChange={(event) => setOtherReason(event.target.value)}
                  placeholder="The rider could not reach the building"
                />
              </Field>
            ) : null}
          </>
        )}
      </div>
    </Dialog>
  );
}
