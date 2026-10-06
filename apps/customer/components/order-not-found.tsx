import * as React from "react";
import { NotFoundState } from "./data-states";

/** An order number nobody has — mistyped, or from a link that was cut short. */
export function OrderNotFound(): React.JSX.Element {
  return (
    <NotFoundState
      title="There’s no order with that number"
      detail="The link may be mistyped or cut short. Every order you have placed is in your history, newest first."
      backHref="/orders"
      backLabel="Your orders"
    />
  );
}
