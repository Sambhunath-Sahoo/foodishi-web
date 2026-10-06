"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardBody, PageTitle } from "@repo/ui";

/**
 * The frame both /login and /signup sit in, so the two screens cannot drift
 * apart. Narrow on purpose: a sign-in form has one job at 390px.
 */
export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  readonly title: string;
  readonly subtitle: string;
  readonly children: React.ReactNode;
  readonly footer: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-5">
      <PageTitle subtitle={subtitle}>{title}</PageTitle>
      <Card>
        <CardBody className="py-5">{children}</CardBody>
      </Card>
      <p className="text-center text-[13px] text-ink-3">{footer}</p>
    </div>
  );
}

export function AuthLink({
  href,
  children,
}: {
  readonly href: string;
  readonly children: React.ReactNode;
}): React.JSX.Element {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center font-medium text-accent no-underline"
    >
      {children}
    </Link>
  );
}
