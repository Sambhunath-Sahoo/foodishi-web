import type { Metadata } from "next";
import * as React from "react";
import { RequireAccount } from "../../components/require-account";
import { ProfileView } from "../../components/profile-view";

export const metadata: Metadata = { title: "Your account" };

/**
 * Behind the same gate as /checkout and /orders: a profile screen needs both a
 * session and the `public.users` row joined to it, and an unlinked identity
 * gets the linking form here rather than an empty edit page.
 */
export default function ProfilePage(): React.JSX.Element {
  return (
    <RequireAccount>
      <ProfileView />
    </RequireAccount>
  );
}
