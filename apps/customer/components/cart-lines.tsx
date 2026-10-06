"use client";

import * as React from "react";
import { Button } from "@repo/ui";
import { VegMark } from "./dish-marks";
import { QuantityStepper } from "./quantity-stepper";
import { formatMoney } from "../lib/format";
import { MAX_QUANTITY, type CartLine } from "../lib/cart";

/**
 * The cart's own lines, with the unit price the menu quoted. The line totals
 * on this screen come from the quote, never from multiplying here — the
 * server is the only thing allowed to decide what an order costs.
 */
export function CartLines({
  lines,
  onSetQuantity,
  onRemove,
}: {
  readonly lines: readonly CartLine[];
  readonly onSetQuantity: (menuItemId: number, quantity: number) => void;
  readonly onRemove: (menuItemId: number) => void;
}): React.JSX.Element {
  return (
    <ul className="flex flex-col">
      {lines.map((line) => (
        <li
          key={line.menuItemId}
          className="flex items-start justify-between gap-3 border-b border-line px-4 py-3 last:border-b-0"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <VegMark isVeg={line.isVeg} />
              <span className="min-w-0 truncate text-sm font-medium text-ink">
                {line.name}
              </span>
            </div>
            <p className="mt-0.5 text-[12px] tabular-nums text-ink-3">
              {formatMoney(line.unitPrice)} each
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-0.5 -ml-3 h-11"
              onClick={() => onRemove(line.menuItemId)}
            >
              Remove
            </Button>
          </div>
          <QuantityStepper
            quantity={line.quantity}
            itemName={line.name}
            min={1}
            max={MAX_QUANTITY}
            onChange={(next) => onSetQuantity(line.menuItemId, next)}
          />
        </li>
      ))}
    </ul>
  );
}
