import type { Metadata } from "next";
import * as React from "react";
import { FavoritesView } from "../../components/favorites-view";

export const metadata: Metadata = { title: "Favourites" };

/**
 * Not behind RequireAccount: favourites live in this browser, not on the
 * account, so a signed-out visitor can still save kitchens while browsing.
 */
export default function FavoritesPage(): React.JSX.Element {
  return <FavoritesView />;
}
