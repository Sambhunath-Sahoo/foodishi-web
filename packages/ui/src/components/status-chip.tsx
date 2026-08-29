import * as React from "react";
import { Badge } from "./badge";
import {
  getOrderStatusPresentation,
  type OrderStatusOrLate,
} from "../status/order-status";

export interface StatusChipProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  /**
   * One of the seven OrderStatus values from the API, or the derived "late".
   * A string is accepted so a status added server-side degrades to "Unknown"
   * rather than failing the build.
   */
  readonly status: OrderStatusOrLate | (string & {});
  /** Override the label; the tone still comes from the status. */
  readonly label?: string;
}

/**
 * The single place an order status becomes a colour. No app hand-picks a
 * token per status.
 */
export function StatusChip({
  status,
  label,
  ...props
}: StatusChipProps): React.JSX.Element {
  const presentation = getOrderStatusPresentation(status);
  return (
    <Badge tone={presentation.tone} {...props}>
      {label ?? presentation.label}
    </Badge>
  );
}
