"use client";

import * as React from "react";
import { Badge, Button } from "@repo/ui";
import { DATA_SOURCE, isFixtureSource } from "../../lib/services";
import { resetFixtures } from "../../lib/services/fixtures";

/**
 * Two halves of the same fact, deliberately in two places.
 *
 * The BADGE is a statement — the ₹18,204 on screen is seed data — so it stays
 * visible in the header where somebody reviewing this console will see it
 * without looking for it.
 *
 * The RESET is a control, and a rare, destructive one, so it lives inside the
 * account menu. Sitting them side by side gave a piece of standing context the
 * same weight as an action, which is the mistake the header already made once.
 *
 * Both render only on the fixture source and only outside production.
 */
export function SampleDataBadge(): React.JSX.Element | null {
  if (!isFixtureSource || process.env.NODE_ENV === "production") return null;

  return (
    <Badge
      tone="warn"
      title={`Data source: ${DATA_SOURCE}. Set NEXT_PUBLIC_DATA_SOURCE=api in apps/partner/.env.local to point this console at the Foodishi API.`}
    >
      Sample data
    </Badge>
  );
}

export function ResetSampleData(): React.JSX.Element | null {
  if (!isFixtureSource || process.env.NODE_ENV === "production") return null;

  return (
    // The rule belongs to this block rather than to a wrapper in the panel: on
    // the API source this whole section is absent, and a wrapper would have
    // left a separator with nothing under it.
    <div className="flex flex-col gap-1.5 border-t border-line pt-3">
      <p className="text-[12px] leading-snug text-ink-3">
        Everything you have changed here lives in this browser. Reset throws it
        away and puts the seed back.
      </p>
      <Button
        variant="outline"
        size="sm"
        className="min-h-11 self-start text-crit hover:bg-crit-soft"
        onClick={() => {
          resetFixtures();
          window.location.reload();
        }}
      >
        Reset sample data
      </Button>
    </div>
  );
}
