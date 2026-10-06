"use client";

import * as React from "react";
import {
  Badge,
  Button,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  DataTableScroll,
  FilterChip,
  ErrorBanner,
  Input,
  Pagination,
  PageTitle,
  SegmentedControl,
  Stat,
  StatRail,
  TableFooter,
  Thumb,
  Toolbar,
} from "@repo/ui";
import { toUserMessage } from "@repo/api-client";
import {
  BoardSkeleton,
  RailSkeleton,
} from "../../../components/board-skeleton";
import { CustomerDrawer } from "../../../components/customer-drawer";
import { OrderDrawer } from "../../../components/order-drawer";
import { QueryState } from "../../../components/query-state";
import { ToolbarHint } from "../../../components/toolbar-hint";
import { RowAction } from "../../../components/row-action";
import {
  formatCount,
  formatDateOnly,
  formatMoneyWhole,
} from "../../../lib/format";
import { DECK_PAGE, DECK_PANEL, DECK_RAIL } from "../../../lib/deck";
import {
  useCustomers,
  useDeactivatedCustomerCount,
  useSetCustomerActive,
  useSummary,
} from "../../../lib/queries";
import { useOpenOrder } from "../../../lib/use-open-order";

/** The avatar in a 38px row. */
const AVATAR_PX = 24;

type Activity = "any" | "active" | "deactivated";

const ACTIVITY_OPTIONS = [
  { value: "any" as const, label: "Any" },
  { value: "active" as const, label: "Enabled" },
  { value: "deactivated" as const, label: "Deactivated" },
];

/** The `is_active` predicate each choice sends. "any" omits it entirely. */
const ACTIVITY_FILTER: Record<Activity, boolean | null> = {
  any: null,
  active: true,
  deactivated: false,
};

/** "1.8", or "—" when there is no denominator to divide by. */
function perCustomer(part: number, whole: number): string {
  return whole === 0 ? "—" : (part / whole).toFixed(1);
}

export default function CustomersPage(): React.JSX.Element {
  // Two pieces of state for one search box: what has been typed, and what has
  // been asked for. The API matches name and email in SQL, so the request is
  // made on submit rather than on every keystroke.
  const [term, setTerm] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [activity, setActivity] = React.useState<Activity>("any");
  const [offset, setOffset] = React.useState(0);
  const [openCustomerId, setOpenCustomerId] = React.useState<number | null>(
    null,
  );
  // In the URL as ?order=, so an open order survives a reload and can be
  // pasted to a colleague (OP-4).
  const {
    orderId: openOrderId,
    open: openOrder,
    close: closeOrder,
  } = useOpenOrder();

  const customers = useCustomers({
    q: query,
    isActive: ACTIVITY_FILTER[activity],
    offset,
  });
  const summary = useSummary();
  const deactivated = useDeactivatedCustomerCount();
  const setActive = useSetCustomerActive();

  const submitSearch = React.useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setQuery(term.trim());
      setOffset(0);
    },
    [term],
  );

  const changeActivity = React.useCallback((next: Activity) => {
    setActivity(next);
    setOffset(0);
  }, []);

  const clearSearch = React.useCallback(() => {
    setTerm("");
    setQuery("");
    setOffset(0);
  }, []);

  const openOrderFromCustomer = React.useCallback((orderId: number) => {
    setOpenCustomerId(null);
    openOrder(orderId);
  }, [openOrder]);

  return (
    <div className={DECK_PAGE}>
      <PageTitle subtitle="Who is ordering, how often, and what they are worth.">
        Customers
      </PageTitle>

      {setActive.error === null ? null : (
        <ErrorBanner
          title="That account could not be switched"
          message={toUserMessage(setActive.error)}
        />
      )}

      <QueryState
        query={summary}
        errorTitle="The customer numbers could not load"
        emptyTitle="No customer metrics yet"
        emptyDetail="Once accounts are registered and orders placed, these figures appear here."
        skeleton={<RailSkeleton label="Loading the customer numbers" />}
      >
        {(data) => (
          <div className={DECK_RAIL}>
            <StatRail ariaLabel="The customer base">
              <Stat
                label="Customers"
                value={formatCount(data.total_users)}
                caption="Registered accounts"
                hint="Every customer profile on the platform, whether or not they have ever ordered."
              />
              <Stat
                label="Ordered recently"
                value={formatCount(data.active_customers)}
                caption={`In the last ${formatCount(data.active_customer_window_days)} days`}
                hint="Customers who placed at least one order inside the window. This is trading activity, not the enable/disable flag beside it — an account nobody has deactivated but who has not ordered in months is not counted here."
              />
              <Stat
                label="Deactivated"
                value={
                  deactivated.data === undefined
                    ? "—"
                    : formatCount(deactivated.data)
                }
                // Neutral ink, not warn: a closed account has no clock running
                // on it, and warn means one is (OP-7).
                tone="default"
                caption="Cannot sign in or order"
                hint="Accounts an administrator has switched off. They keep their order history and are still counted in the total beside them."
              />
              <Stat
                label="Orders each"
                value={perCustomer(data.total_orders, data.total_users)}
                caption="Platform average, all time"
                hint="Every order ever placed, divided by every registered account. A blunt average: it counts accounts that have never ordered in the denominator."
              />
              <Stat
                label="Lifetime revenue"
                value={formatMoneyWhole(data.gross_revenue)}
                caption="Delivered, across everyone"
                hint="The full value of every delivered order on the platform, before Foodishi's commission. Per-customer spend is on each customer's own panel."
              />
            </StatRail>
          </div>
        )}
      </QueryState>

      <Toolbar ariaLabel="Customer directory filters">
        <form onSubmit={submitSearch} className="flex items-center gap-2">
          <Input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Name or email"
            aria-label="Search customers by name or email"
            className="h-8 w-[200px] text-[13px]"
          />
          <Button type="submit" variant="outline" size="sm">
            Search
          </Button>
        </form>
        <SegmentedControl
          ariaLabel="Account state"
          options={ACTIVITY_OPTIONS}
          value={activity}
          onValueChange={changeActivity}
        />
        {query === "" ? null : (
          <FilterChip label="Matching" value={query} onDismiss={clearSearch} />
        )}
        <ToolbarHint>
          Every customer, platform-wide · profiles only — open a row for their
          order count and lifetime spend.
        </ToolbarHint>
      </Toolbar>

      <QueryState
        query={customers}
        errorTitle="The customer directory could not load"
        emptyTitle={
          query === ""
            ? "No customers on the platform yet"
            : `Nothing matches “${query}”`
        }
        emptyDetail={
          query === ""
            ? "Every registered account appears here, oldest first."
            : "The search matches names and email addresses. Clear it to see the whole directory."
        }
        isEmpty={(page) => page.items.length === 0}
        skeleton={
          <BoardSkeleton
            rows={10}
            label="Loading the customer directory"
            note="Reading the customer directory…"
          />
        }
      >
        {(page) => (
          <DataTableScroll
            className={DECK_PANEL}
            footer={
              <>
                <TableFooter
                  shown={page.items.length}
                  total={page.total}
                  noun="customers"
                  sortedBy="when the account was registered, oldest first"
                  // The honest limit of this table, stated where the counts are
                  // rather than left for the reader to discover by looking for
                  // a column that is not there.
                  extra="no order totals in this table — open a row to sum one customer's"
                />
                <Pagination
                  total={page.total}
                  limit={page.limit}
                  offset={page.offset}
                  onOffsetChange={setOffset}
                  noun="customers"
                  className="border-t border-line"
                />
              </>
            }
          >
            <DataTable aria-label="Customer directory, oldest account first">
              <DataTableHead>
                <tr>
                  <DataTableHeaderCell className="pl-4">
                    Customer
                  </DataTableHeaderCell>
                  <DataTableHeaderCell>Email</DataTableHeaderCell>
                  <DataTableHeaderCell>Phone</DataTableHeaderCell>
                  <DataTableHeaderCell>City</DataTableHeaderCell>
                  <DataTableHeaderCell>Joined</DataTableHeaderCell>
                  <DataTableHeaderCell>State</DataTableHeaderCell>
                  <DataTableHeaderCell numeric>Change it</DataTableHeaderCell>
                </tr>
              </DataTableHead>
              <DataTableBody>
                {page.items.map((person) => {
                  const isBusy =
                    setActive.isPending &&
                    setActive.variables?.userId === person.id;

                  return (
                    <DataTableRow
                      key={person.id}
                      selected={person.id === openCustomerId}
                      onClick={() => setOpenCustomerId(person.id)}
                      className="cursor-pointer"
                    >
                      <DataTableCell className="max-w-[220px] pl-4 text-ink">
                        <span className="flex items-center gap-2">
                          <Thumb
                            src={person.avatar_url}
                            name={person.name}
                            size={AVATAR_PX}
                            shape="circle"
                          />
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setOpenCustomerId(person.id);
                            }}
                            aria-label={`Open ${person.name}`}
                            className="truncate rounded-card font-medium text-accent underline underline-offset-2 hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                          >
                            {person.name}
                          </button>
                        </span>
                      </DataTableCell>
                      <DataTableCell className="max-w-[220px] text-ink-2">
                        {person.email}
                      </DataTableCell>
                      <DataTableCell mono>{person.phone}</DataTableCell>
                      <DataTableCell className="text-ink-2">
                        {person.city}
                      </DataTableCell>
                      <DataTableCell mono>
                        {formatDateOnly(person.created_at)}
                      </DataTableCell>
                      <DataTableCell>
                        {person.is_active ? (
                          <Badge tone="ok">Enabled</Badge>
                        ) : (
                          <Badge tone="mute">Deactivated</Badge>
                        )}
                      </DataTableCell>
                      <DataTableCell numeric>
                        {/* Neutral, and one step removed from the write. A red
                            "Deactivate" on every row — 25 of them, the
                            operator's own included — was one slip of the mouse
                            from locking a customer out with no confirmation
                            (OP-8). The drawer states the consequence first. */}
                        <RowAction
                          isPending={isBusy}
                          onClick={() => setOpenCustomerId(person.id)}
                          title="Open the account: orders, addresses, and deactivation."
                          ariaLabel={`Manage ${person.name}`}
                        >
                          Manage
                        </RowAction>
                      </DataTableCell>
                    </DataTableRow>
                  );
                })}
              </DataTableBody>
            </DataTable>
          </DataTableScroll>
        )}
      </QueryState>

      <CustomerDrawer
        userId={openCustomerId}
        onClose={() => setOpenCustomerId(null)}
        onOpenOrder={openOrderFromCustomer}
      />
      <OrderDrawer orderId={openOrderId} onClose={() => closeOrder()} />
    </div>
  );
}
