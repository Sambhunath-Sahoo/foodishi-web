import * as React from "react";
import { FavoritesView } from "../../components/favorites-view";

/**
 * Not behind RequireAccount: favourites live in this browser, not on the
 * account, so a signed-out visitor can still save kitchens while browsing.
 */
export default function FavoritesPage(): React.JSX.Element {
  return <FavoritesView />;
}
