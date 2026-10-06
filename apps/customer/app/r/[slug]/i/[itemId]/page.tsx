import type { Metadata } from "next";
import * as React from "react";
import { MenuItemView } from "../../../../../components/menu-item-view";

export const metadata: Metadata = { title: "Dish" };

/**
 * A dish under its kitchen. Nested rather than a top-level /dish/{id} so the
 * bottom tab bar keeps "Discover" lit — it matches on `/r/` — and so a shared
 * link still says whose kitchen the dish belongs to.
 *
 * Both ids stay strings until the view parses them: the API owns what a valid
 * dish id is, and its 404 names the dish better than a guess made in the
 * browser would.
 */
export default async function MenuItemPage({
  params,
}: {
  readonly params: Promise<{ readonly slug: string; readonly itemId: string }>;
}): Promise<React.JSX.Element> {
  const { slug, itemId } = await params;
  return <MenuItemView restaurantParam={slug} itemParam={itemId} />;
}
