import * as React from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { Tone } from "../status/tone";
import { PatternCanvas, PatternNote } from "./pattern-canvas";
import { Chip, Money, OrderChip } from "./pattern-bits";

/** The board's clock. Every SLA figure below is relative to this. */
const NOW = "14:36";

interface BoardOrder {
  readonly id: string;
  readonly restaurant: string;
  readonly customer: string;
  readonly items: number;
  readonly placed: string;
  readonly due: string;
  /** Rendered verbatim — the words carry the state, not the colour. */
  readonly sla: string;
  readonly slaTone: Tone;
  /** The seven API statuses, or the derived "late". */
  readonly status: string;
  /** Only a row that needs a human right now gets a stripe. */
  readonly stripe?: Tone;
  readonly rider?: string;
  readonly total: number;
}

const ORDERS: readonly BoardOrder[] = [
  {
    id: "ORD-4465",
    restaurant: "Hyderabadi Dum",
    customer: "Anitha K.",
    items: 4,
    placed: "13:51",
    due: "14:21",
    sla: "15:02 over",
    slaTone: "crit",
    status: "late",
    stripe: "crit",
    rider: "Unassigned",
    total: 2140.0,
  },
  {
    id: "ORD-4471",
    restaurant: "Tandoori Nights",
    customer: "Priya R.",
    items: 3,
    placed: "14:02",
    due: "14:32",
    sla: "4:19 over",
    slaTone: "crit",
    status: "late",
    stripe: "crit",
    rider: "Farhan Q.",
    total: 1248.5,
  },
  {
    id: "ORD-4468",
    restaurant: "Idli Factory",
    customer: "Sandeep M.",
    items: 2,
    placed: "14:09",
    due: "14:39",
    sla: "2:44 left",
    slaTone: "warn",
    status: "preparing",
    stripe: "warn",
    rider: "Vinod S.",
    total: 486.0,
  },
  {
    id: "ORD-4460",
    restaurant: "Crust & Coal",
    customer: "Meera J.",
    items: 1,
    placed: "13:47",
    due: "14:41",
    sla: "4:51 left",
    slaTone: "cool",
    status: "out_for_delivery",
    rider: "Imran A.",
    total: 899.0,
  },
  {
    id: "ORD-4472",
    restaurant: "Crust & Coal",
    customer: "Rahul D.",
    items: 2,
    placed: "14:14",
    due: "14:44",
    sla: "7:38 left",
    slaTone: "mute",
    status: "confirmed",
    rider: "Unassigned",
    total: 640.0,
  },
  {
    id: "ORD-4473",
    restaurant: "Tandoori Nights",
    customer: "Nisha B.",
    items: 5,
    placed: "14:21",
    due: "14:51",
    sla: "14:22 left",
    slaTone: "mute",
    status: "pending",
    rider: "Unassigned",
    total: 1795.0,
  },
  {
    id: "ORD-4455",
    restaurant: "Idli Factory",
    customer: "Gopal V.",
    items: 3,
    placed: "13:29",
    due: "13:59",
    sla: "on time",
    slaTone: "ok",
    status: "delivered",
    rider: "Vinod S.",
    total: 372.0,
  },
  {
    id: "ORD-4463",
    restaurant: "Hyderabadi Dum",
    customer: "Kiran T.",
    items: 2,
    placed: "13:58",
    due: "14:28",
    sla: "closed 14:04",
    slaTone: "mute",
    status: "cancelled",
    rider: "—",
    total: 780.0,
  },
];

const FILTERS = [
  { label: "All", count: 38, selected: false },
  { label: "Late", count: 2, selected: true },
  { label: "Preparing", count: 9, selected: false },
  { label: "Out for delivery", count: 6, selected: false },
  { label: "Unassigned", count: 4, selected: false },
] as const;

function BoardHeader(): React.JSX.Element {
  return (
    <div className="tp-stack-sm">
      <div className="tp-spread">
        <div>
          <h1 className="tp-title">Live board</h1>
          <p className="tp-sub">
            Bengaluru · Koramangala hub · refreshed{" "}
            <span className="tp-mono">{NOW}:04 IST</span>
          </p>
        </div>
        <div className="tp-row-flex">
          <button type="button" className="tp-btn tp-btn--outline" data-size="md">
            Export CSV
          </button>
          <button type="button" className="tp-btn tp-btn--primary" data-size="md">
            Assign riders
          </button>
        </div>
      </div>
    </div>
  );
}

function BoardToolbar(): React.JSX.Element {
  return (
    <div className="tp-spread">
      <div className="tp-seg" role="tablist" aria-label="Board filter">
        {FILTERS.map((filter) => (
          <button
            key={filter.label}
            type="button"
            role="tab"
            aria-selected={filter.selected}
            className="tp-seg__item"
          >
            {filter.label}
            <span className="tp-seg__count">{filter.count}</span>
          </button>
        ))}
      </div>
      <p className="tp-legend">
        <span className="tp-legend__key">
          <span className="tp-legend__stripe" aria-hidden="true" />
          stripe = needs a human now
        </span>
        <span className="tp-legend__key">
          <Chip tone="warn">SLA approaching</Chip>
        </span>
      </p>
    </div>
  );
}

function BoardRow({ order }: { readonly order: BoardOrder }): React.JSX.Element {
  return (
    <tr className="tp-row" data-stripe={order.stripe}>
      <td>
        <span className="tp-mono tp-strong">{order.id}</span>
      </td>
      <td>{order.restaurant}</td>
      <td className="tp-muted">{order.customer}</td>
      <td className="tp-num tp-mono">{order.items}</td>
      <td className="tp-mono tp-muted">{order.placed}</td>
      <td className="tp-mono tp-muted">{order.due}</td>
      <td className={`tp-mono tp-tone-${order.slaTone}`}>{order.sla}</td>
      <td>
        <OrderChip status={order.status} />
      </td>
      <td className={order.rider === "Unassigned" ? "tp-faint" : undefined}>
        {order.rider}
      </td>
      <td className="tp-num tp-strong">
        <Money amount={order.total} />
      </td>
      <td>
        <button type="button" className="tp-btn tp-btn--ghost" data-size="sm">
          Open
        </button>
      </td>
    </tr>
  );
}

function LiveBoardPattern(): React.JSX.Element {
  return (
    <PatternCanvas width={1180} device="Operator · desktop · 13px rows">
      <div className="tp-stack">
        <BoardHeader />
        <BoardToolbar />
        <div className="tp-scroll">
          <table className="tp-table" aria-label="Live orders">
            <thead>
              <tr>
                <th scope="col">Order</th>
                <th scope="col">Restaurant</th>
                <th scope="col">Customer</th>
                <th scope="col" className="tp-num">
                  Items
                </th>
                <th scope="col">Placed</th>
                <th scope="col">Due</th>
                <th scope="col">SLA</th>
                <th scope="col">Status</th>
                <th scope="col">Rider</th>
                <th scope="col" className="tp-num">
                  Total
                </th>
                <th scope="col">
                  <span className="tp-faint">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {ORDERS.map((order) => (
                <BoardRow key={order.id} order={order} />
              ))}
            </tbody>
          </table>
        </div>
        <PatternNote>
          <b>Two signals, never one.</b> A breached row carries the crit stripe
          on its leading edge <i>and</i> a dotted chip <i>and</i> the words
          &ldquo;15:02 over&rdquo; — the board reads correctly in greyscale.
          Only rows needing a human right now are striped: the cancelled order
          keeps its crit chip but drops the stripe, because nobody has to act on
          it. Ids, clock times and the SLA column are IBM Plex Mono; money is
          right-aligned tabular; the whole table scrolls inside{" "}
          <code>.tp-scroll</code> so the page body never moves sideways.
        </PatternNote>
      </div>
    </PatternCanvas>
  );
}

/** Just the rows, so a reviewer can check the stripe rule state by state. */
function RowStatesPattern(): React.JSX.Element {
  return (
    <PatternCanvas width={1180} device="Operator · row states">
      <div className="tp-stack">
        <div className="tp-scroll">
          <table className="tp-table" aria-label="Row states">
            <thead>
              <tr>
                <th scope="col">Order</th>
                <th scope="col">Status</th>
                <th scope="col">SLA</th>
                <th scope="col">Stripe</th>
                <th scope="col">Why</th>
              </tr>
            </thead>
            <tbody>
              {ORDERS.map((order) => (
                <tr key={order.id} className="tp-row" data-stripe={order.stripe}>
                  <td className="tp-mono tp-strong">{order.id}</td>
                  <td>
                    <OrderChip status={order.status} />
                  </td>
                  <td className={`tp-mono tp-tone-${order.slaTone}`}>
                    {order.sla}
                  </td>
                  <td className="tp-mono tp-muted">{order.stripe ?? "none"}</td>
                  <td className="tp-muted">
                    {order.stripe === undefined
                      ? "Nothing for an operator to do this minute"
                      : "Needs a human before the next refresh"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PatternNote>
          <b>The stripe is a workload signal, not a status echo.</b> Status
          already has a chip. The stripe answers a different question — which of
          these thirty-eight rows do I touch first.
        </PatternNote>
      </div>
    </PatternCanvas>
  );
}

const meta: Meta = {
  title: "Patterns/Operator — Live board row",
  parameters: {
    docs: {
      description: {
        component:
          "The operator board at desktop width: dense 13px rows, a dotted status chip, and a 3px severity stripe on rows that need a human now. Toggle the theme in the toolbar — every value is a token read.",
      },
    },
  },
};

export default meta;

type Story = StoryObj;

export const LiveBoard: Story = { render: () => <LiveBoardPattern /> };

export const RowStates: Story = { render: () => <RowStatesPattern /> };
