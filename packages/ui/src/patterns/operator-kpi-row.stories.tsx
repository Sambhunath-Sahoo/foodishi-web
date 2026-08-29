import * as React from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { Tone } from "../status/tone";
import { PatternCanvas, PatternNote } from "./pattern-canvas";
import { Chip } from "./pattern-bits";
import { Sparkline } from "./sparkline";

interface Kpi {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly unit?: string;
  readonly tone: Tone;
  /** A tile only earns a stripe when the number itself demands action. */
  readonly stripe?: Tone;
  readonly deltaTone: Tone;
  readonly delta: string;
  /** Twelve five-minute buckets, oldest first. */
  readonly trend: readonly number[];
  readonly trendLabel: string;
  readonly footLeft: string;
  readonly footRight: string;
}

const KPIS: readonly Kpi[] = [
  {
    id: "in-flight",
    label: "Orders in flight",
    value: "38",
    tone: "accent",
    deltaTone: "ok",
    delta: "+6 vs last hour",
    trend: [24, 26, 25, 28, 27, 31, 30, 33, 32, 35, 36, 38],
    trendLabel: "Orders in flight over the last hour, rising from 24 to 38",
    footLeft: "9 restaurants live",
    footRight: "4 unassigned",
  },
  {
    id: "prep-time",
    label: "Median prep time",
    value: "21:10",
    unit: "min",
    tone: "warn",
    deltaTone: "warn",
    delta: "3:40 over target",
    trend: [16, 16, 17, 17, 18, 18, 19, 19, 20, 20, 21, 21],
    trendLabel: "Median prep time over the last hour, drifting from 16 to 21 minutes",
    footLeft: "Target 17:30",
    footRight: "Hyderabadi Dum slowest",
  },
  {
    id: "sla-breached",
    label: "SLA breached",
    value: "7",
    tone: "crit",
    stripe: "crit",
    deltaTone: "crit",
    delta: "+4 in 30 min",
    trend: [1, 1, 2, 2, 2, 3, 3, 4, 5, 5, 6, 7],
    trendLabel: "SLA breaches over the last hour, climbing from 1 to 7",
    footLeft: "Oldest 15:02 over",
    footRight: "2 unassigned",
  },
];

function KpiTile({ kpi }: { readonly kpi: Kpi }): React.JSX.Element {
  return (
    <div className="tp-panel" data-stripe={kpi.stripe}>
      <div className="tp-panel__body">
        <p className="tp-label">{kpi.label}</p>
        <div className="tp-tile__mid">
          <p className={`tp-tile__value tp-tone-${kpi.tone}`}>
            {kpi.value}
            {kpi.unit !== undefined ? (
              <span className="tp-tile__unit">{kpi.unit}</span>
            ) : null}
          </p>
          <Sparkline
            points={kpi.trend}
            label={kpi.trendLabel}
            tone={kpi.tone}
          />
        </div>
        <div style={{ marginTop: 10 }}>
          <Chip tone={kpi.deltaTone}>{kpi.delta}</Chip>
        </div>
        <div className="tp-tile__foot">
          <span>{kpi.footLeft}</span>
          <span className="tp-mono">{kpi.footRight}</span>
        </div>
      </div>
    </div>
  );
}

function KpiRowPattern(): React.JSX.Element {
  return (
    <PatternCanvas width={1180} device="Operator · desktop · KPI row">
      <div className="tp-stack">
        <div>
          <h1 className="tp-title">Today</h1>
          <p className="tp-sub">
            Koramangala hub · last 60 minutes · five-minute buckets
          </p>
        </div>
        <div className="tp-kpis">
          {KPIS.map((kpi) => (
            <KpiTile key={kpi.id} kpi={kpi} />
          ))}
        </div>
        <PatternNote>
          <b>Only the breached tile is loud.</b> Three tiles, three different
          hues — indigo for the neutral count, turmeric for the drift, kashmiri
          for the breach — and only the breach carries a stripe. If every tile
          were red the row would say nothing. The sparkline inherits{" "}
          <code>currentColor</code> from its tone, so it needs no palette of its
          own, and it ships an <code>aria-label</code> because a shape is not a
          number: &ldquo;{KPIS[2]?.trendLabel}&rdquo;.
        </PatternNote>
      </div>
    </PatternCanvas>
  );
}

function KpiTrendsPattern(): React.JSX.Element {
  return (
    <PatternCanvas width={1180} device="Operator · sparkline, every tone">
      <div className="tp-stack">
        <div className="tp-panel">
          <div className="tp-panel__body">
            <div className="tp-row-flex" style={{ gap: 28 }}>
              {KPIS.map((kpi) => (
                <div key={kpi.id} className="tp-stack-sm">
                  <p className="tp-label">{kpi.label}</p>
                  <Sparkline
                    points={kpi.trend}
                    label={kpi.trendLabel}
                    tone={kpi.tone}
                    width={180}
                    height={44}
                  />
                  <p className="tp-mono tp-muted" style={{ fontSize: 11 }}>
                    {kpi.trend.at(0)} → {kpi.trend.at(-1)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <PatternNote>
          <b>The sparkline is a trend, not a chart.</b> No axes, no grid, no
          tooltip — the number beside it is the fact, the shape is only the
          direction. Both themes get the same 1.5px stroke because the tone
          token lifts itself on dark ground.
        </PatternNote>
      </div>
    </PatternCanvas>
  );
}

const meta: Meta = {
  title: "Patterns/Operator — KPI row",
  parameters: {
    docs: {
      description: {
        component:
          "Three tiles above the live board. The breached-SLA tile is the only one in crit, and the only one striped — scarcity is what makes the colour mean something.",
      },
    },
  },
};

export default meta;

type Story = StoryObj;

export const KpiRow: Story = { render: () => <KpiRowPattern /> };

export const SparklineTones: Story = { render: () => <KpiTrendsPattern /> };
