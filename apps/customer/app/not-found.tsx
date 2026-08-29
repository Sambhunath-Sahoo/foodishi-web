import * as React from "react";
import Link from "next/link";
import { EmptyState } from "@repo/ui";

/**
 * /r/{nonsense} and every other unmatched path used to fall through to each
 * view's own empty state, which reads as "this kitchen has no dishes" rather
 * than "there is no such kitchen".
 */
export default function NotFound(): React.JSX.Element {
  return (
    <div className="py-6">
      <EmptyState
        title="That page does not exist"
        detail="The link may be old, or the kitchen may have left Foodishi."
        action={
          <Link
            href="/"
            className="text-[14px] text-accent no-underline underline-offset-2 hover:underline"
          >
            Browse restaurants
          </Link>
        }
      />
    </div>
  );
}
