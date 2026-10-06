import type { Metadata } from "next";
import * as React from "react";
import { MenuView } from "../../../components/menu-view";

export const metadata: Metadata = { title: "Menu" };

/**
 * The URL carries `{id}-{slug}` so the menu can be fetched in one request,
 * but a hand-typed slug still resolves — see parseRestaurantRef.
 */
export default async function RestaurantMenuPage({
  params,
}: {
  readonly params: Promise<{ readonly slug: string }>;
}): Promise<React.JSX.Element> {
  const { slug } = await params;
  return <MenuView param={slug} />;
}
