"use client";

import * as React from "react";
import { useSession, type ProfileStatus } from "./provider";
import {
  hasPlatformRole,
  PLATFORM_ROLE_LABEL,
  type PlatformRole,
} from "./platform-role";

/**
 * The gate every signed-in screen sits behind: a spinner while the session
 * rehydrates, a redirect to /login when there is none, children when ready.
 * `requirePlatformRole` adds a fourth answer — signed in, but not staff — and
 * that one is refused where the visitor stands rather than redirected.
 *
 * The redirect is a plain location change by default so this package stays
 * free of a router dependency. An app that wants a soft navigation passes
 * `onRedirect={(to) => router.replace(to)}`.
 */
const DEFAULT_LOGIN_PATH = "/login";
const SPINNER_SIZE_PX = 28;
const SPINNER_STROKE_PX = 2;
const SPINNER_DURATION_MS = 700;
const SPINNER_ANIMATION_NAME = "foodishi-auth-spin";

const spinnerKeyframes = `@keyframes ${SPINNER_ANIMATION_NAME} { to { transform: rotate(360deg); } }`;

export interface AuthSpinnerProps {
  readonly label?: string;
}

/**
 * Deliberately dependency-free: @repo/ui already depends on this package, so
 * importing a component back from it would be a cycle. Colours are design
 * tokens, never literals.
 */
export function AuthSpinner({ label = "Checking your session" }: AuthSpinnerProps): React.JSX.Element {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.75rem",
        minHeight: "60vh",
        color: "var(--ink-3)",
        fontFamily: "var(--font-ui)",
        fontSize: "0.875rem",
      }}
    >
      <style>{spinnerKeyframes}</style>
      <span
        aria-hidden="true"
        style={{
          width: SPINNER_SIZE_PX,
          height: SPINNER_SIZE_PX,
          borderRadius: "50%",
          border: `${SPINNER_STROKE_PX}px solid var(--line)`,
          borderTopColor: "var(--accent)",
          animation: `${SPINNER_ANIMATION_NAME} ${SPINNER_DURATION_MS}ms linear infinite`,
        }}
      />
      <span>{label}</span>
    </div>
  );
}

/**
 * The refusal a signed-in visitor sees when the session is fine but the account
 * is not allowed here. Same constraints as AuthSpinner — no import from
 * @repo/ui, tokens instead of literal colours — so it is plainer than a real
 * page and that is the trade.
 */
export interface AuthRefusalProps {
  readonly title: string;
  readonly description: string;
  /** Actions under the text. A way out matters: this screen is a dead end otherwise. */
  readonly children?: React.ReactNode;
}

export function AuthRefusal({
  title,
  description,
  children,
}: AuthRefusalProps): React.JSX.Element {
  return (
    <div
      // Announced, not just drawn: it replaces content the visitor was already
      // waiting on, so a screen reader has to hear that the answer was no.
      role="alert"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        padding: "1.5rem",
        fontFamily: "var(--font-ui)",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: "0.75rem",
          maxWidth: "26rem",
          padding: "1.5rem",
          borderRadius: "var(--radius)",
          border: "1px solid var(--line)",
          background: "var(--surface)",
          boxShadow: "var(--shadow)",
        }}
      >
        <span
          style={{
            padding: "0.125rem 0.5rem",
            borderRadius: "var(--radius-pill)",
            background: "var(--crit-soft)",
            color: "var(--crit)",
            fontSize: "0.6875rem",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          No access
        </span>
        <h1
          style={{
            margin: 0,
            fontFamily: "var(--font-display)",
            fontSize: "1.125rem",
            fontWeight: 600,
            color: "var(--ink)",
          }}
        >
          {title}
        </h1>
        <p
          style={{
            margin: 0,
            fontSize: "0.875rem",
            lineHeight: 1.55,
            color: "var(--ink-3)",
          }}
        >
          {description}
        </p>
        {children}
      </div>
    </div>
  );
}

/**
 * Why the gate said no, in words the person in front of it can act on. A failed
 * /me is kept apart from a genuine wrong-rank refusal: telling someone their
 * account lacks access when the truth is the API never answered sends them to
 * ask an admin for something they already have.
 */
function describeRefusal(
  minimum: PlatformRole,
  profileStatus: ProfileStatus,
  email: string | undefined,
): AuthRefusalProps {
  if (profileStatus === "error") {
    return {
      title: "Your access could not be checked",
      description:
        "The Foodishi API did not answer when we asked what this account may do, " +
        "so nothing behind this gate was opened. Reload the page; if it keeps " +
        "failing, the API is the place to look.",
    };
  }

  const who =
    email === undefined ? "This account" : `${email} is signed in, and`;
  return {
    title: "This account is not Foodishi platform staff",
    description:
      `${PLATFORM_ROLE_LABEL[minimum]} access or higher is needed here. ${who} ` +
      "does not have it. Signing in again will not change that — ask a Foodishi " +
      "admin to grant access, or sign out and use an operator account.",
  };
}

interface PlatformRefusalProps {
  readonly minimum: PlatformRole;
  readonly profileStatus: ProfileStatus;
  readonly email: string | undefined;
  readonly onSignOut: () => void;
}

/**
 * The wrong-rank state, with the one action that can help: sign out and come
 * back as someone else. Without it the visitor is stranded on a screen whose
 * only other exit is the browser's back button.
 */
function PlatformRefusal({
  minimum,
  profileStatus,
  email,
  onSignOut,
}: PlatformRefusalProps): React.JSX.Element {
  const { title, description } = describeRefusal(minimum, profileStatus, email);

  return (
    <AuthRefusal title={title} description={description}>
      <button
        type="button"
        onClick={onSignOut}
        style={{
          padding: "0.375rem 0.75rem",
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--line-2)",
          background: "transparent",
          color: "var(--ink-2)",
          fontFamily: "inherit",
          fontSize: "0.8125rem",
          cursor: "pointer",
        }}
      >
        Sign out
      </button>
    </AuthRefusal>
  );
}

export interface RequireAuthProps {
  readonly children: React.ReactNode;
  /** Where to send a signed-out visitor. Defaults to /login. */
  readonly redirectTo?: string;
  /**
   * Shown while the gate is still waiting — the session rehydrating, and the
   * profile lookup behind `requirePlatformRole`. Defaults to a spinner. It is
   * never the refusal: that one has to be read, not skinned away.
   */
  readonly fallback?: React.ReactNode;
  /** Pass `router.replace` for a soft navigation instead of a full load. */
  readonly onRedirect?: (destination: string) => void;
  /**
   * Append `?next=<current path>` so /login can return the visitor to where
   * they were. Default true.
   */
  readonly preserveReturnPath?: boolean;
  /**
   * Also demand Foodishi platform staff, at this rank or above. Omitted — as the
   * partner and customer apps omit it — a live session is the whole
   * requirement, which is why adding this changed nothing for them.
   *
   * The rank rides on GET /me, so a gate that sets this waits for the profile
   * before it decides.
   */
  readonly requirePlatformRole?: PlatformRole;
}

function buildDestination(redirectTo: string, preserveReturnPath: boolean): string {
  if (!preserveReturnPath || typeof window === "undefined") return redirectTo;

  const current = `${window.location.pathname}${window.location.search}`;
  if (current === redirectTo || current === "") return redirectTo;

  const separator = redirectTo.includes("?") ? "&" : "?";
  return `${redirectTo}${separator}next=${encodeURIComponent(current)}`;
}

export function RequireAuth({
  children,
  redirectTo = DEFAULT_LOGIN_PATH,
  fallback,
  onRedirect,
  preserveReturnPath = true,
  requirePlatformRole,
}: RequireAuthProps): React.JSX.Element | null {
  const { status, profileStatus, platformRole, user, signOut } = useSession();

  React.useEffect(() => {
    if (status !== "unauthenticated") return;

    const destination = buildDestination(redirectTo, preserveReturnPath);
    if (onRedirect !== undefined) {
      onRedirect(destination);
      return;
    }
    if (typeof window !== "undefined") window.location.replace(destination);
  }, [status, redirectTo, onRedirect, preserveReturnPath]);

  if (status === "loading") return <>{fallback ?? <AuthSpinner />}</>;

  // Render nothing rather than the login screen's shadow while the redirect
  // is in flight — a protected screen must never flash its contents.
  if (status === "unauthenticated") {
    return <>{fallback ?? <AuthSpinner label="Redirecting to sign in" />}</>;
  }

  // No rank asked for: authenticated is the whole test, exactly as before.
  if (requirePlatformRole === undefined) return <>{children}</>;

  // A session arrives before /me does. Refusing in this window would flash the
  // refusal at every legitimate operator on every reload, so it is a wait.
  if (profileStatus === "idle" || profileStatus === "loading") {
    return <>{fallback ?? <AuthSpinner label="Checking your access" />}</>;
  }

  // Signed in, profile settled, rank too low — or absent, which is what an
  // unlinked identity and a plain customer both look like. Nothing about
  // signing in again fixes any of those, so this is the end of the road and it
  // says so rather than bouncing them around /login.
  if (!hasPlatformRole(platformRole, requirePlatformRole)) {
    return (
      <PlatformRefusal
        minimum={requirePlatformRole}
        profileStatus={profileStatus}
        email={user?.email}
        onSignOut={() => void signOut()}
      />
    );
  }

  return <>{children}</>;
}
