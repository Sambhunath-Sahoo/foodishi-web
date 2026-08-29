"use client";

import * as React from "react";
import { PageTitle, SegmentedControl, Toolbar } from "@repo/ui";
import { CommissionReport } from "../../../components/reports/commission-report";
import { CustomerReport } from "../../../components/reports/customer-report";
import { OrderReport } from "../../../components/reports/order-report";
import { RestaurantReport } from "../../../components/reports/restaurant-report";
import { SalesReport } from "../../../components/reports/sales-report";
import { DECK_PAGE } from "../../../lib/deck";

type Report = "sales" | "restaurants" | "orders" | "customers" | "commission";

const REPORT_OPTIONS = [
  { value: "sales" as const, label: "Sales" },
  { value: "restaurants" as const, label: "Restaurants" },
  { value: "orders" as const, label: "Orders" },
  { value: "customers" as const, label: "Customers" },
  { value: "commission" as const, label: "Commission" },
];

/** What each report answers, said once, under the title. */
const SUBTITLES: Record<Report, string> = {
  sales: "How much came in, day by day.",
  restaurants: "Which kitchens earned it, and which are slipping.",
  orders: "Where orders ended up, and when they are placed.",
  customers: "Who is spending, and whether they came back.",
  commission: "What the platform kept, and what it owes at settlement.",
};

type Range = "7" | "30" | "90";

const RANGE_OPTIONS = [
  { value: "7" as const, label: "7 days" },
  { value: "30" as const, label: "30 days" },
  { value: "90" as const, label: "90 days" },
];

/**
 * Five reports, one window.
 *
 * One page with two controls rather than five sidebar entries, because the
 * question is almost never "show me the sales report" — it is "how did last
 * month go", and the answer is read across all five. Keeping the window fixed
 * while the report changes is what makes them comparable; changing report does
 * not reset the range, and that is deliberate.
 *
 * Every report is computed from the same set of orders (see
 * lib/services/fixtures/reports.ts). Two reports that disagreed about last week
 * would make the reader stop trusting all five.
 */
export default function ReportsPage(): React.JSX.Element {
  const [report, setReport] = React.useState<Report>("sales");
  const [range, setRange] = React.useState<Range>("30");
  const days = Number.parseInt(range, 10);

  return (
    <div className={DECK_PAGE}>
      <PageTitle subtitle={SUBTITLES[report]}>Reports</PageTitle>

      <Toolbar ariaLabel="Report and window">
        <SegmentedControl
          ariaLabel="Which report"
          options={REPORT_OPTIONS}
          value={report}
          onValueChange={setReport}
        />
        <SegmentedControl
          ariaLabel="How far back"
          options={RANGE_OPTIONS}
          value={range}
          onValueChange={setRange}
        />
      </Toolbar>

      {report === "sales" ? <SalesReport days={days} /> : null}
      {report === "restaurants" ? <RestaurantReport days={days} /> : null}
      {report === "orders" ? <OrderReport days={days} /> : null}
      {report === "customers" ? <CustomerReport days={days} /> : null}
      {report === "commission" ? <CommissionReport days={days} /> : null}
    </div>
  );
}
