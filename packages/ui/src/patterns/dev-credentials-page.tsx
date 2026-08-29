"use client";

import * as React from "react";
import {
  DEV_CREDENTIALS,
  DEV_PASSWORD,
  type DevCredential,
} from "@repo/api-client";
import { Badge } from "../components/badge";
import { Card, CardBody } from "../components/card";
import { PageTitle } from "../components/page-title";

/**
 * Every seeded login, in one place. Rendered at `/creds` in all three consoles.
 *
 * WHY ONE PAGE INSTEAD OF A HINT PER SIGN-IN SCREEN. There are nineteen seeded
 * accounts across three audiences, and the one you need is rarely the one on the
 * screen you are looking at: checking that a kitchen's staff member cannot reject
 * an order means signing into the partner console as a specific person while the
 * operator console is open next to it. A hint under one form cannot answer that.
 *
 * WHY IT IS GATED. `isVisible` is false in a production build, so a deployed
 * console serves an empty page. That matters more than it looks: the addresses
 * here are REAL identities — `ops.admin@foodishi.internal` is the operator
 * account and is not going to change — and the password is real too, for the
 * development Supabase project. What makes printing them safe is that the
 * project is a development one and the password is already committed in the
 * repository in plain text.
 *
 * The same email in production must have a DIFFERENT password, set in Supabase
 * and never written down here. The page says so itself, because the person most
 * likely to reuse this password is the person reading this page.
 */

const AUDIENCE_LABEL: Readonly<Record<DevCredential["audience"], string>> = {
  operator: "Operations console",
  restaurant: "Restaurant console",
  customer: "Customer app",
};

const AUDIENCE_PORT: Readonly<Record<DevCredential["audience"], string>> = {
  operator: "localhost:3000",
  restaurant: "localhost:3001",
  customer: "localhost:3002",
};

const AUDIENCE_ORDER: readonly DevCredential["audience"][] = [
  "operator",
  "restaurant",
  "customer",
];

/** False in a production build. Set by Next itself, so it needs no config. */
export const isDevCredentialsVisible = process.env.NODE_ENV !== "production";

function CopyableEmail({ email }: { readonly email: string }): React.JSX.Element {
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => {
      setCopied(false);
    }, 1500);
    return () => {
      window.clearTimeout(timer);
    };
  }, [copied]);

  return (
    <button
      type="button"
      onClick={() => {
        // Guarded: clipboard access throws in an insecure context and is absent
        // in some embedded webviews. A copy button that explodes is worse than
        // one that quietly does nothing, since the address is on screen anyway.
        void navigator.clipboard
          ?.writeText(email)
          .then(() => {
            setCopied(true);
          })
          .catch(() => {
            /* nothing to do — the address is selectable on screen */
          });
      }}
      className="rounded-chip px-1 py-0.5 text-left font-mono text-[12px] text-ink-2 hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      aria-label={`Copy ${email}`}
    >
      {email}
      <span className="ml-2 font-sans text-[11px] text-ink-4">
        {copied ? "copied" : "copy"}
      </span>
    </button>
  );
}

export function DevCredentialsPage(): React.JSX.Element {
  if (!isDevCredentialsVisible) {
    return (
      <main className="mx-auto max-w-[560px] px-4 py-10">
        <PageTitle>Not available</PageTitle>
        <p className="mt-2 font-sans text-[14px] text-ink-3">
          Seeded logins are only listed in a development build.
        </p>
      </main>
    );
  }

  const groups = AUDIENCE_ORDER.map((audience) => ({
    audience,
    rows: DEV_CREDENTIALS.filter((row) => row.audience === audience),
  })).filter((group) => group.rows.length > 0);

  return (
    <main className="mx-auto flex max-w-[760px] flex-col gap-5 px-4 py-8">
      <div>
        <PageTitle subtitle={`${String(DEV_CREDENTIALS.length)} seeded accounts, one password.`}>
          Sign-in credentials
        </PageTitle>
      </div>

      <Card stripe="warn">
        <CardBody className="py-3">
          <div className="flex flex-wrap items-baseline gap-2">
            <Badge tone="warn">Development only</Badge>
            <p className="font-sans text-[12px] text-ink-3">
              This page is not served by a production build.
            </p>
          </div>
          <p className="mt-2 font-sans text-[13px] leading-relaxed text-ink-2">
            Password for every account below:{" "}
            <code className="font-mono text-ink">{DEV_PASSWORD}</code>
          </p>
          <p className="mt-2 font-sans text-[12px] leading-relaxed text-ink-3">
            These are real identities against a development Supabase project —{" "}
            <code className="font-mono">ops.admin@foodishi.internal</code> is the
            operator account and will not change. The password is what makes them
            safe to print: it is committed in this repository in plain text and
            belongs to the development project only.{" "}
            <strong className="font-semibold text-ink-2">
              The same addresses in production must have a different password, set
              in Supabase and never written down here.
            </strong>
          </p>
        </CardBody>
      </Card>

      {groups.map((group) => (
        <Card key={group.audience}>
          <CardBody className="py-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-serif text-[16px] text-ink">
                {AUDIENCE_LABEL[group.audience]}
              </h2>
              <code className="font-mono text-[12px] text-ink-4">
                {AUDIENCE_PORT[group.audience]}
              </code>
            </div>

            <ul className="mt-2 flex flex-col divide-y divide-line">
              {group.rows.map((row) => (
                <li
                  key={`${row.email}-${row.grant}`}
                  className="flex flex-wrap items-baseline justify-between gap-x-3 py-1.5"
                >
                  <CopyableEmail email={row.email} />
                  <span className="flex items-baseline gap-2">
                    <span className="font-sans text-[12px] text-ink-3">
                      {row.grant}
                    </span>
                    {row.isActive ? null : (
                      // The revoked membership is seeded on purpose, so it is
                      // labelled rather than hidden: signing in as this person
                      // is how you check that require_staff filters on is_active.
                      <Badge tone="mute">revoked</Badge>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ))}

      <p className="font-sans text-[12px] leading-relaxed text-ink-4">
        Generated from the live database. After reseeding, run{" "}
        <code className="font-mono">
          uv run python -m app.seed.dev_credentials
        </code>{" "}
        in <code className="font-mono">foodishi-api</code>.
      </p>
    </main>
  );
}
