"use client";

import * as React from "react";
import { Button, Dialog } from "@repo/ui";
import type { MenuItem } from "../lib/types";

/**
 * The consequence of adding a dish from a second kitchen, stated before the
 * tap: how many dishes are in the cart, whose they are, and that adding this
 * one empties it. Emptying a cart is destructive, so its button is outlined
 * (DESIGN.md non-negotiable #5).
 *
 * Rendered by both the menu and the single-dish screen from the same
 * useAddToCart flow, so the wording cannot differ between them.
 */
export function CartSwitchDialog({
  pending,
  currentKitchenName,
  currentLineCount,
  onCancel,
  onConfirm,
}: {
  /** The dish waiting on a confirm; null keeps the dialog closed. */
  readonly pending: MenuItem | null;
  readonly currentKitchenName: string | null;
  readonly currentLineCount: number;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}): React.JSX.Element {
  return (
    <Dialog
      open={pending !== null}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
      title="Start a new cart?"
      description={
        <>
          Your cart holds {currentLineCount}{" "}
          {currentLineCount === 1 ? "dish" : "dishes"} from{" "}
          <strong>{currentKitchenName ?? "another kitchen"}</strong>. One order
          can only come from one kitchen, so adding{" "}
          <strong>{pending?.name}</strong> empties it.
        </>
      }
      footer={
        <>
          <Button variant="outline" onClick={onCancel}>
            Keep my cart
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            Empty it and add {pending?.name}
          </Button>
        </>
      }
    />
  );
}
