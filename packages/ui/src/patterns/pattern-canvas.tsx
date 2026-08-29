import * as React from "react";
import { PATTERN_CSS } from "./pattern-css";

export interface PatternCanvasProps {
  /**
   * The width the pattern is genuinely read at — 1180 for the operator desktop
   * board, 720 for a partner tablet, 390 for a customer phone (DESIGN.md,
   * Density). Shown in the caption so a reviewer judges it at the right size.
   */
  readonly width: number;
  /** e.g. "Operator · desktop". */
  readonly device: string;
  readonly children: React.ReactNode;
}

/**
 * Frames one composed pattern at its real width and injects the token-driven
 * stylesheet the pattern stories share.
 */
export function PatternCanvas({
  width,
  device,
  children,
}: PatternCanvasProps): React.JSX.Element {
  return (
    <div className="tp">
      <style>{PATTERN_CSS}</style>
      <div className="tp-device" style={{ maxWidth: width }}>
        <p className="tp-device__caption">
          <span>{device}</span>
          <span className="tp-device__rule" aria-hidden="true" />
          <span className="tp-device__px">{width}px</span>
        </p>
        <div className="tp-device__body">{children}</div>
      </div>
    </div>
  );
}

/** Short prose panel shown beside a pattern so the rule is visible on canvas. */
export function PatternNote({
  children,
}: {
  readonly children: React.ReactNode;
}): React.JSX.Element {
  return <div className="tp-note">{children}</div>;
}
