"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, ThemeSwitcher, Thumb, cn } from "@repo/ui";
import { ResetSampleData } from "./sample-data";
import { useSession } from "../../lib/session";

/**
 * Who is signed in, and everything about this tablet that is not the
 * restaurant — behind one control.
 *
 * It used to be four side by side in the header: a three-segment theme pill, a
 * name, a Reset and a Sign out. Together they were wider than the section tabs
 * and heavier than the restaurant name, which made the loudest things in the
 * chrome a comfort setting and a button pressed once a shift. None of them is a
 * mid-service tap, so none of them earns permanent space.
 *
 * A disclosure panel rather than a menu: it holds a radiogroup and a link as
 * well as buttons, and `role="menu"` would promise arrow-key semantics for
 * children that are not menu items. `aria-expanded` and `aria-controls` say
 * what it actually is.
 */

/** Where a keyboard lands after Escape, and what a screen reader returns to. */
function useDismiss(
  isOpen: boolean,
  close: () => void,
): React.RefObject<HTMLDivElement | null> {
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!isOpen) return;

    function onPointerDown(event: PointerEvent): void {
      const container = containerRef.current;
      if (container !== null && !container.contains(event.target as Node)) close();
    }
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") close();
    }

    // `pointerdown`, not `click`: a tap that starts outside should dismiss
    // before it can activate whatever is underneath.
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, close]);

  return containerRef;
}

export function AccountMenu(): React.JSX.Element {
  const router = useRouter();
  const { profile, signOut } = useSession();

  const [isOpen, setIsOpen] = React.useState(false);
  const [isSigningOut, setIsSigningOut] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);

  const close = React.useCallback((): void => {
    setIsOpen(false);
    triggerRef.current?.focus();
  }, []);

  const containerRef = useDismiss(isOpen, close);

  const who = profile?.name ?? "Signed in";

  async function handleSignOut(): Promise<void> {
    setIsSigningOut(true);
    try {
      await signOut();
      router.replace("/login");
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={isOpen}
        aria-controls="account-panel"
        aria-label={`Account and settings for ${who}`}
        onClick={() => setIsOpen((current) => !current)}
        className={cn(
          // The same 44px as the tabs below it. Shorter, it looked like a
          // different kind of control from the rest of the chrome, and it is
          // still something a thumb has to hit on a tablet.
          "flex min-h-11 max-w-[240px] items-center gap-2 rounded-card border px-2.5",
          "font-sans transition-colors",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          isOpen
            ? "border-line-2 bg-surface-2"
            : "border-transparent hover:bg-surface-2",
        )}
      >
        {/* `text-ink-2!`: Thumb draws its initials in ink-4, which is 2.4:1 on
            the light surface — unreadable, here of all places, where the
            initials ARE the avatar. The shared component is not this app's to
            change, so the override is local and marked important to beat
            Thumb's own class, which comes after this one. */}
        <Thumb
          src={profile?.avatar_url}
          name={who}
          size={28}
          shape="circle"
          className="border border-line text-ink-2!"
        />
        <span className="truncate text-[14px] text-ink-2">{who}</span>
        <svg
          aria-hidden="true"
          width="12"
          height="12"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn(
            "shrink-0 text-ink-3 transition-transform",
            isOpen && "rotate-180",
          )}
        >
          <path d="M4 6.5 8 10.5l4-4" />
        </svg>
      </button>

      {isOpen ? (
        <div
          id="account-panel"
          className={cn(
            "absolute right-0 z-40 mt-1.5 w-[292px] rounded-card border border-line",
            "bg-surface p-4 shadow-card",
            "flex flex-col gap-4",
          )}
        >
          <div className="flex items-center gap-3">
            <Thumb
              src={profile?.avatar_url}
              name={who}
              size={38}
              shape="circle"
              className="border border-line text-ink-2!"
            />
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-[15px] leading-tight text-ink">{who}</span>
              <span className="truncate font-mono text-[12px] leading-tight text-ink-3">
                {profile?.email ?? ""}
              </span>
            </span>
          </div>

          <Link
            href="/profile"
            onClick={() => setIsOpen(false)}
            className="flex min-h-11 items-center rounded-card border border-line px-3 font-sans text-[14px] font-medium text-ink transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Your details and password
          </Link>

          <div className="flex flex-col gap-2 border-t border-line pt-3">
            {/* Labelled, not the icon-only pill. In here there is room for the
                words, and "Light / Dark / System" needs no hover to read. */}
            <span className="text-[10px] font-bold tracking-[0.09em] text-ink-3 uppercase">
              Theme
            </span>
            <ThemeSwitcher className="w-full [&>button]:h-[34px] [&>button]:flex-1 [&>button]:justify-center" />
          </div>

          <ResetSampleData />

          <div className="border-t border-line pt-3">
            <Button
              variant="outline"
              block
              className="min-h-11"
              isPending={isSigningOut}
              pendingLabel="Signing out…"
              onClick={() => void handleSignOut()}
            >
              Sign out
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
