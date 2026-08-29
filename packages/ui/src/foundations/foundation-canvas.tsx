import * as React from "react";
import { PATTERN_CSS } from "../patterns/pattern-css";
import { FOUNDATION_CSS } from "./foundation-css";

export interface FoundationCanvasProps {
  readonly title: string;
  readonly subtitle: string;
  readonly children: React.ReactNode;
}

/** Shared frame for the Foundations stories: page title, then the specimen. */
export const FoundationCanvas = React.forwardRef<
  HTMLDivElement,
  FoundationCanvasProps
>(function FoundationCanvas({ title, subtitle, children }, ref) {
  return (
    <div className="tp" ref={ref}>
      {/* One string child: React treats <style> children as a text resource. */}
      <style>{`${PATTERN_CSS}\n${FOUNDATION_CSS}`}</style>
      <div className="tp-fd">
        <div>
          <h1 className="tp-title">{title}</h1>
          <p className="tp-sub">{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  );
});

export function FoundationGroup({
  title,
  note,
  children,
}: {
  readonly title: string;
  readonly note: string;
  readonly children: React.ReactNode;
}): React.JSX.Element {
  return (
    <section className="tp-fd__group">
      <div className="tp-fd__head">
        <h2>{title}</h2>
        <p>{note}</p>
      </div>
      {children}
    </section>
  );
}
