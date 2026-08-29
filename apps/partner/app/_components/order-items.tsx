import * as React from "react";
import { Thumb, cn } from "@repo/ui";
import type { DishFace } from "../../lib/queries/menu";
import type { OrderItem } from "../../lib/types";

/** How many dishes a queue card lists before it defers to Details. */
const MAX_VISIBLE_LINES = 5;

/** Big enough to recognise a dish at arm's length, small enough to stay a list. */
const THUMB_PX = 40;
const COMPACT_THUMB_PX = 32;

export interface OrderItemsProps {
  readonly items: readonly OrderItem[];
  /**
   * `menu_item_id` -> the dish's photo. Omitted, or empty, and the lines render
   * exactly as they did before photos existed — which is also what a kitchen
   * with no uploads and a staffer without `menu.view` both get.
   */
  readonly faces?: ReadonlyMap<number, DishFace>;
  /** Tighter rows and a smaller photo, for a board column. */
  readonly compact?: boolean;
  readonly maxLines?: number;
  readonly className?: string;
}

/**
 * Read from two feet away: the dish's photo, its quantity, its name.
 *
 * The photo earns its place by being the fastest way to recognise a dish that
 * somebody already knows how to cook — quicker than reading "Osmania Biscuits
 * (4 pc)". It never carries meaning on its own: the quantity and the name are
 * still the row, and a dish with no photo keeps its initials so the column of
 * names stays aligned instead of ragging around missing images.
 *
 * Deliberately no money per line — see the comment on the row below.
 */
export function OrderItems({
  items,
  faces,
  compact = false,
  maxLines = MAX_VISIBLE_LINES,
  className,
}: OrderItemsProps): React.JSX.Element {
  if (items.length === 0) {
    return (
      <p className={cn("text-[15px] leading-snug text-ink-3", className)}>
        No lines on this order — it came back with an empty basket, which should
        not happen. The dishes and quantities would be listed here.
      </p>
    );
  }

  const shown = items.slice(0, maxLines);
  const hidden = items.length - shown.length;

  // Decided from the whole menu, not from this order's own lines. Scoping it to
  // the card meant a ticket whose three dishes happened to have no covers drew
  // no photo column at all, and sat beside one that did — the dish names on a
  // board then started at two different x positions. Either every card on the
  // screen has the column or none does; a dish with no cover keeps its initials.
  const hasPhotoColumn = faces !== undefined && faces.size > 0;
  const thumbSize = compact ? COMPACT_THUMB_PX : THUMB_PX;
  // Indent for the wrapped note and the "+ N more" line, so both sit under the
  // dish name rather than under the photo.
  const indent = hasPhotoColumn ? thumbSize + 8 + 36 : 36;

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <ul className="flex flex-col">
        {shown.map((item) => {
          const face = faces?.get(item.menu_item_id);
          return (
            // No per-line price. The only decision this card carries is what to
            // cook, and a rupee figure beside every dish is a second column of
            // digits competing with the dish name for the two-feet glance this
            // screen is read at. The order total stays below; line-by-line money
            // is on Details, where somebody is actually reading money.
            <li key={item.id} className={cn("flex flex-col", compact ? "py-[2px]" : "py-[3px]")}>
              <div className="flex items-center gap-2">
                {hasPhotoColumn ? (
                  <Thumb
                    src={face?.imageUrl ?? null}
                    name={item.item_name}
                    size={thumbSize}
                    isDecorative
                  />
                ) : null}
                <p
                  className={cn(
                    "flex min-w-0 items-baseline gap-2 leading-snug text-ink",
                    compact ? "text-[14px]" : "text-[15px]",
                  )}
                >
                  <span className="min-w-[2.25rem] shrink-0 font-mono font-semibold tabular-nums">
                    {item.quantity}×
                  </span>
                  <span className="min-w-0">{item.item_name}</span>
                </p>
              </div>
              {item.notes !== null && item.notes !== "" ? (
                // A note changes what leaves the kitchen, so it survives the trim
                // and keeps its word label — colour alone is never the signal
                // (DESIGN.md non-negotiable #3).
                <p
                  className={cn(
                    "leading-snug text-warn",
                    compact ? "text-[12px]" : "text-[13px]",
                  )}
                  style={{ paddingLeft: indent }}
                >
                  <span className="font-semibold">Note:</span> {item.notes}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>

      {hidden > 0 ? (
        // A twelve-line order used to make a 600px card and push every other
        // ticket off screen. The count is honest about what it hid.
        <p
          className={cn("leading-snug text-ink-3", compact ? "text-[12px]" : "text-[13px]")}
          style={{ paddingLeft: indent }}
        >
          + {hidden} more {hidden === 1 ? "line" : "lines"} — see Details
        </p>
      ) : null}
    </div>
  );
}
