"use client";

import * as React from "react";
import { toUserMessage } from "@repo/api-client";
import { ErrorBanner, LiveDot, StatusChip, Toolbar, cn } from "@repo/ui";
import { KanbanTicket } from "./kanban-ticket";
import { CardSkeletons, EmptyCard, LoadError } from "../_components/states";
import { byUrgency } from "../_lib/lateness";
import { TICK_QUEUE_MS, useNow } from "../_lib/use-now";
import { QUEUE_REFRESH_MS } from "../../lib/query-keys";
import { moveFrom } from "../../lib/order-flow";
import { useBoardStatusMutation, useLiveOrders } from "../../lib/queries/orders";
import type { ReadyKitchen } from "../../lib/kitchen";
import type { Order, OrderStatus } from "../../lib/types";

const MS_PER_SECOND = 1_000;

interface Column {
  readonly status: OrderStatus;
  readonly label: string;
  /** What a non-zero count in this column means somebody should do. */
  readonly caption: string;
}

/**
 * The ladder, left to right, in the order `lib/order-flow` moves through it.
 *
 * Five columns rather than four: the board shows where every live ticket is,
 * and a ticket already with a courier is still live. `delivered` and
 * `cancelled` are not columns — they have left the queue, and the History tab
 * is where they are read.
 */
const COLUMNS: readonly Column[] = [
  {
    status: "pending",
    label: "Not answered",
    caption: "A customer is waiting to hear back",
  },
  { status: "confirmed", label: "Accepted", caption: "Taken on, not started" },
  { status: "preparing", label: "In the kitchen", caption: "Being cooked now" },
  {
    status: "ready_for_pickup",
    label: "Ready",
    caption: "Cooked, waiting to go out",
  },
  {
    status: "out_for_delivery",
    label: "On the way",
    caption: "With whoever is delivering it",
  },
];

export interface KanbanBoardProps {
  readonly kitchen: ReadyKitchen;
  /** Shared with the list view, so switching views keeps the narrowing. */
  readonly status: OrderStatus | null;
  readonly onStatusChange: (status: OrderStatus | null) => void;
}

/**
 * The live queue as a board: one column per status, tickets moving rightwards.
 *
 * The board answers a different question from the list. The list is sorted by
 * urgency and says "what is the next thing to do"; the board says "where is
 * everything, and is anything piling up" — which is the question a manager
 * standing in a kitchen at 8pm actually has.
 *
 * A ticket only ever moves one column right, because `lib/order-flow` allows
 * exactly one forward step from each status and the server enforces its own
 * copy of that. There is no backwards move and no skipping: a drop anywhere
 * else is refused before a request is made, so the board cannot ask for
 * something the API would reject.
 */
export function KanbanBoard({
  kitchen,
  status,
  onStatusChange,
}: KanbanBoardProps): React.JSX.Element {
  const now = useNow(TICK_QUEUE_MS);
  const queue = useLiveOrders(kitchen);
  const mutation = useBoardStatusMutation(kitchen);

  /** The ticket under the pointer, or null. Drives the drop highlighting. */
  const [dragged, setDragged] = React.useState<Order | null>(null);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, canScrollRight] = useScrollEdges(scrollRef);

  const all = queue.data === undefined ? [] : byUrgency(queue.data.items, now);
  const isLoaded = queue.data !== undefined;

  const advance = React.useCallback(
    (orderId: number, to: OrderStatus): void => {
      mutation.mutate({ orderId, status: to });
    },
    [mutation],
  );

  // Where the dragged ticket is allowed to land: exactly one status.
  const dropTarget = React.useMemo<OrderStatus | null>(() => {
    if (dragged === null) return null;
    const move = moveFrom(dragged.status);
    if (move === null || !kitchen.can(move.needs)) return null;
    return move.to;
  }, [dragged, kitchen]);

  const onDrop = React.useCallback(
    (column: OrderStatus): void => {
      if (dragged === null || dropTarget !== column) return;
      advance(dragged.id, column);
      setDragged(null);
    },
    [advance, dragged, dropTarget],
  );

  return (
    <div className="flex flex-col gap-4">
      <Toolbar
        ariaLabel="Board status"
        right={
          <LiveDot
            interval={QUEUE_REFRESH_MS / MS_PER_SECOND}
            at={queue.dataUpdatedAt > 0 ? queue.dataUpdatedAt : null}
          />
        }
      >
        {isLoaded ? (
          <span className="text-[15px] text-ink-2">
            {all.length === 0
              ? "Nothing live right now"
              : `${String(all.length)} live ${all.length === 1 ? "ticket" : "tickets"} across five stages · drag a card right, or press its button`}
          </span>
        ) : (
          <span className="text-[15px] text-ink-2">Counting live tickets…</span>
        )}
      </Toolbar>

      {/* A status filter narrows the list view; on a board it would empty four
          of five columns and hide the very thing the board is for. So it is
          offered as a way back to the whole board rather than applied. */}
      {status !== null ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-line bg-surface-2 px-3 py-2">
          <p className="text-[13px] leading-snug text-ink-2">
            The <strong className="font-semibold">{status.replace(/_/g, " ")}</strong>{" "}
            filter narrows the list view. A board showing one stage would be four
            empty columns, so all five are shown here.
          </p>
          <button
            type="button"
            onClick={() => {
              onStatusChange(null);
            }}
            className="shrink-0 rounded-card border border-line-2 px-2.5 py-1 text-[13px] font-medium text-accent hover:bg-accent-soft"
          >
            Clear the filter
          </button>
        </div>
      ) : null}

      {mutation.error !== null ? (
        <ErrorBanner
          title="That move was refused"
          message={toUserMessage(mutation.error)}
        />
      ) : null}

      {queue.isPending ? <CardSkeletons count={3} /> : null}

      {queue.error !== null ? (
        <LoadError
          error={queue.error}
          title="Could not load the board"
          onRetry={() => {
            void queue.refetch();
          }}
        />
      ) : null}

      {isLoaded && all.length === 0 ? (
        <EmptyCard
          title="No live orders right now"
          detail="New tickets land in the first column the moment a customer checks out, and move right as the kitchen works them."
        />
      ) : null}

      {all.length > 0 ? (
        // The board scrolls in its own container rather than the page: five
        // columns will not fit a tablet, and a horizontally scrolling page
        // takes the header and the nav with it (DESIGN.md).
        <div className="relative">
          <div ref={scrollRef} className="-mx-1 overflow-x-auto px-1 pb-2">
            <div className="flex min-w-max items-start gap-3">
            {COLUMNS.map((column) => (
              <BoardColumn
                key={column.status}
                column={column}
                orders={all.filter((order) => order.status === column.status)}
                kitchen={kitchen}
                now={now}
                isDropTarget={dropTarget === column.status}
                isDragActive={dragged !== null}
                draggedId={dragged?.id ?? null}
                movingId={
                  mutation.isPending ? (mutation.variables?.orderId ?? null) : null
                }
                onAdvance={advance}
                onDragStart={setDragged}
                onDragEnd={() => setDragged(null)}
                onDrop={() => onDrop(column.status)}
              />
              ))}
            </div>
          </div>

          {/* Aria-hidden: the columns themselves are in the DOM and reachable,
              so this is purely the visual cue that they continue. */}
          {canScrollLeft ? (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-bg to-transparent"
            />
          ) : null}
          {canScrollRight ? (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-bg to-transparent"
            />
          ) : null}
        </div>
      ) : null}

      {all.length > 0 && canScrollRight ? (
        <p className="text-[13px] text-ink-3">
          Scroll sideways for the rest of the ladder — five stages, and the last
          two are a courier&apos;s in the finished product.
        </p>
      ) : null}
    </div>
  );
}

/**
 * Whether the board can still be scrolled left or right.
 *
 * The shell caps page content at 1240px and five readable columns need more
 * than that, so the board scrolls — which is what every board does. The part
 * that is not free is telling somebody: macOS draws no resting scrollbar, so a
 * half-visible column reads as a broken card rather than as "there is more this
 * way". These two booleans draw the edge fades that say so.
 */
function useScrollEdges(
  ref: React.RefObject<HTMLDivElement | null>,
): readonly [boolean, boolean] {
  const [edges, setEdges] = React.useState<readonly [boolean, boolean]>([false, false]);

  React.useEffect(() => {
    const element = ref.current;
    if (element === null) return;

    const measure = (): void => {
      const { scrollLeft, scrollWidth, clientWidth } = element;
      // A pixel of slack: fractional layout widths otherwise leave a fade
      // showing on a board that is already scrolled all the way over.
      setEdges([scrollLeft > 1, scrollLeft + clientWidth < scrollWidth - 1]);
    };

    measure();
    element.addEventListener("scroll", measure, { passive: true });
    // Columns appear and disappear as tickets move, which changes the width
    // without any scrolling having happened.
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => {
      element.removeEventListener("scroll", measure);
      observer.disconnect();
    };
  }, [ref]);

  return edges;
}

interface BoardColumnProps {
  readonly column: Column;
  readonly orders: readonly Order[];
  readonly kitchen: ReadyKitchen;
  readonly now: number;
  readonly isDropTarget: boolean;
  readonly isDragActive: boolean;
  readonly draggedId: number | null;
  readonly movingId: number | null;
  readonly onAdvance: (orderId: number, to: OrderStatus) => void;
  readonly onDragStart: (order: Order) => void;
  readonly onDragEnd: () => void;
  readonly onDrop: () => void;
}

function BoardColumn({
  column,
  orders,
  kitchen,
  now,
  isDropTarget,
  isDragActive,
  draggedId,
  movingId,
  onAdvance,
  onDragStart,
  onDragEnd,
  onDrop,
}: BoardColumnProps): React.JSX.Element {
  return (
    <section
      aria-label={`${column.label} — ${String(orders.length)}`}
      onDragOver={(event) => {
        // Without preventDefault the browser refuses the drop outright.
        if (!isDropTarget) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      }}
      onDrop={(event) => {
        if (!isDropTarget) return;
        event.preventDefault();
        onDrop();
      }}
      className={cn(
        "flex w-[17.5rem] shrink-0 flex-col gap-2 rounded-card border p-2 transition-colors",
        isDropTarget
          ? "border-accent bg-accent-soft"
          : // Dimming the columns that cannot take the card is the only hint a
            // drag gets; a cursor change alone is invisible at arm's length.
            isDragActive
            ? "border-line bg-surface-2 opacity-60"
            : "border-line bg-surface-2",
      )}
    >
      <header className="flex flex-col gap-1 px-1 pt-1">
        <div className="flex items-center justify-between gap-2">
          <StatusChip status={column.status} label={column.label} />
          <span className="font-mono text-[18px] leading-none font-semibold tabular-nums text-ink">
            {orders.length}
          </span>
        </div>
        <p className="text-[12px] leading-snug text-ink-3">{column.caption}</p>
      </header>

      <div className="flex flex-col gap-2">
        {orders.length === 0 ? (
          <p
            className={cn(
              "rounded-card border border-dashed px-3 py-6 text-center text-[13px] leading-snug",
              isDropTarget ? "border-accent text-accent" : "border-line-2 text-ink-3",
            )}
          >
            {isDropTarget ? "Drop to move it here" : "Nothing at this stage"}
          </p>
        ) : (
          orders.map((order) => (
            <KanbanTicket
              key={order.id}
              order={order}
              kitchen={kitchen}
              now={now}
              isMoving={movingId === order.id}
              isDragging={draggedId === order.id}
              onAdvance={onAdvance}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
            />
          ))
        )}
      </div>
    </section>
  );
}
