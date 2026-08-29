"use client";

import * as React from "react";

/**
 * The boundary for a throw in app/layout.tsx itself, which app/error.tsx cannot
 * catch — it renders INSIDE the layout. This one replaces the whole document, so
 * it must supply its own <html> and <body> and cannot use @repo/ui: a layout
 * that failed may be the reason the providers and the stylesheet are absent.
 *
 * Styles are inline for the same reason. Deliberately plain.
 */
export default function GlobalError({
  error,
  reset,
}: {
  readonly error: Error & { readonly digest?: string };
  readonly reset: () => void;
}): React.JSX.Element {
  React.useEffect(() => {
    console.error("Global error", error.digest ?? "", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          background: "#fff",
          color: "#1a1a1a",
        }}
      >
        <main style={{ maxWidth: "32rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "18px", fontWeight: 600, margin: "0 0 8px" }}>
            Foodishi could not load
          </h1>
          <p
            style={{
              fontSize: "14px",
              lineHeight: 1.6,
              color: "#555",
              margin: "0 0 20px",
            }}
          >
            Nothing has been ordered or charged. Reload to try again.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              font: "inherit",
              fontSize: "14px",
              padding: "9px 18px",
              borderRadius: "8px",
              border: "1px solid #d4d4d4",
              background: "#fafafa",
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </main>
      </body>
    </html>
  );
}
