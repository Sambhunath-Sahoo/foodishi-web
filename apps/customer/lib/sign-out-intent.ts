/**
 * Whether the customer is signing out on purpose, right now.
 *
 * WHY THIS EXISTS. Sign out lives on /profile, which sits behind
 * <RequireAccount>. The moment the session ends, that gate sees "signed out"
 * and bounces to /login?next=/profile — the same answer it gives an expired
 * token — racing the sign-out button's own move to "/". The gate fired last,
 * so choosing to leave dropped you on a sign-in form asking you to come back.
 * The gate reads this to tell the two apart.
 *
 * Module state rather than React state because the gate and the button sit in
 * different trees of the same page, and the answer only has to live for the
 * one navigation in between.
 */
let isSigningOut = false;

/** Set just before the session is ended on purpose. */
export function beginSignOut(): void {
  isSigningOut = true;
}

/** The sign-out failed, so nothing is leaving after all. */
export function cancelSignOut(): void {
  isSigningOut = false;
}

/**
 * Read once, by the gate's redirect. Consuming it is what keeps a later,
 * genuine session expiry going to /login as it should. It cannot be cleared
 * by the button instead: the gate's redirect runs in an effect after the
 * re-render, which is after the button's own code has finished.
 */
export function takeSignOutIntent(): boolean {
  const wasSigningOut = isSigningOut;
  isSigningOut = false;
  return wasSigningOut;
}
