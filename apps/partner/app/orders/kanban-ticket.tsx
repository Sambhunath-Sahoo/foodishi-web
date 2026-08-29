"use client";

import * as React from "react";
import Link from "next/link";
import { Button, SEVERITY_TEXT, Skeleton, cn } from "@repo/ui";
import { OrderItems } from "../_components/order-items";
import { TicketCard } from "../_components/ticket-card";
import { formatMoney, pluralise } from "../_lib/format";
import { readLateness } from "../_lib/lateness";
import { moveFrom } from "../../lib/order-flow";
import { useDishFaces } from "../../lib/queries/menu";
import { useOrder } from "../../lib/queries/orders";
import type { ReadyKitchen } from "../../lib/kitchen";
import type { Order, OrderStatus } from "../../lib/types";

/** A board column is narrow, so a card lists fewer lines than a queue card. */
const BOARD_MAX_LINES = 3;

export interface KanbanTicketProps {
  readonly order: Order;
  readonly kitchen: ReadyKitchen;
  readonly now: number;
  /** True while this particular card's move is in flight. */
  readonly isMoving: boolean;
  readonly onAdvance: (orderId: number, to: OrderStatus) => void;
  readonly onDragStart: (order: Order) => void;
  readonly onDragEnd: () => void;
  readonly isDragging: boolean;
}

/**
 * One ticket in a board column.
 *
 * Narrower and shorter than the queue card, because a column holds a stack of
 * them and the job here is "which ticket is this, and can it move" rather than
 * "read the whole order" — Details is one tap away for that.
 *
 * The move is a button, not only a drag. Dragging is a mouse affordance and
 * this console runs on a kitchen tablet, where HTML5 drag events never fire;
 * a board whose only way forward was a drag would be unusable on the device it
 * was built for, and unreachable by keyboard on the ones where it works.
 */
export function KanbanTicket({
  order,
  kitchen,
  now,
  isMoving,
  onAdvance,
  onDragStart,
  onDragEnd,
  isDragging,
}: KanbanTicketProps): React.JSX.Element {
  const late = readLateness(order.status, order.promised_at, now);
  const detail = useOrder(kitchen, String(order.id), { frozen: true });
  const faces = useDishFaces(kitchen);

  const move = moveFrom(order.status);
  const mayMove = move !== null && kitchen.can(move.needs);
  const itemCount = detail.data?.items.length ?? 0;

  return (
    <TicketCard
      tier={late.tier}
      // Only a movable ticket is draggable: offering the gesture on a card that
      // cannot go anywhere teaches the wrong thing about the board.
      draggable={mayMove}
      onDragStart={(event) => {
        // The id also rides on the event so a drop can be read without state,
        // and so dragging out of the window does nothing surprising.
        event.dataTransfer.setData("text/plain", String(order.id));
        event.dataTransfer.effectAllowed = "move";
        onDragStart(order);
      }}
      onDragEnd={onDragEnd}
      className={cn(
        "flex flex-col gap-2 px-3 py-2.5",
        mayMove && "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-40",
        isMoving && "pointer-events-none opacity-60",
      )}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-mono text-[16px] leading-none font-semibold tabular-nums text-ink">
          #{order.id}
        </span>
        <span
          className={cn("font-mono text-[13px] tabular-nums", SEVERITY_TEXT[late.tier])}
        >
          {late.headline}
        </span>
        <Link
          href={`/orders/${order.id}`}
          className="ml-auto inline-flex min-h-9 items-center rounded-card px-2 font-sans text-[13px] font-medium text-accent hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Details
        </Link>
      </div>

      {detail.isPending ? (
        <Skeleton className="h-9 w-full" label="Loading order lines" />
      ) : detail.data !== undefined ? (
        <OrderItems
          items={detail.data.items}
          faces={faces}
          maxLines={BOARD_MAX_LINES}
          compact
        />
      ) : null}

      <div className="flex items-baseline justify-between gap-3 border-t border-line pt-1.5">
        <span className="text-[12px] text-ink-3">
          {itemCount === 0 ? "Total" : pluralise(itemCount, "line", "lines")}
        </span>
        <span className="font-mono text-[15px] font-semibold tabular-nums text-ink">
          {formatMoney(order.total_amount)}
        </span>
      </div>

      {move === null ? null : mayMove ? (
        <Button
          size="sm"
          block
          isPending={isMoving}
          pendingLabel="Moving…"
          onClick={() => {
            onAdvance(order.id, move.to);
          }}
        >
          {move.label}
        </Button>
      ) : (
        // Not a disabled button: this is not a state that will clear, and a
        // disabled control on a tablet explains itself in a tooltip nobody
        // hovers. The sentence says whose move it is instead.
        <p className="text-[12px] leading-snug text-ink-3">
          {move.label} is not yours to press.
        </p>
      )}
    </TicketCard>
  );
}
