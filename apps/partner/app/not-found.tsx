import * as React from "react";
import { Card, EmptyState } from "@repo/ui";
import { LinkButton } from "./_components/link-button";

/**
 * Any path this console does not have — a mistyped address, an old bookmark —
 * used to fall through to Next's own unbranded 404, outside the console's look
 * and with no way back but the browser's. On a tablet mid-service that is a
 * dead end; this says what happened and puts the Dashboard one tap away.
 *
 * Rendered inside the app shell, so the header and section rail stay put and
 * any other screen is still a tap away too.
 */
export default function NotFound(): React.JSX.Element {
  return (
    <div className="py-6">
      <Card>
        <EmptyState
          title="There is no such page in this console"
          detail="The address may be mistyped, or the link may be from an older version of the console. Nothing about your restaurant has changed."
          action={
            <LinkButton href="/" variant="primary">
              Back to the Dashboard
            </LinkButton>
          }
        />
      </Card>
    </div>
  );
}
