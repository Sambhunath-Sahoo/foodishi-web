"use client";

import * as React from "react";
import {
  Button,
  EmptyState,
  Input,
  PageTitle,
  Pagination,
  Skeleton,
  cn,
} from "@repo/ui";
import { QueryError } from "./data-states";
import { RestaurantCard } from "./restaurant-card";
import {
  ChipSelect,
  CuisineChip,
  FilterToggle,
  RAIL,
  RailDivider,
  SortIcon,
} from "./filter-chips";
import {
  DISCOVERY_PAGE_SIZE,
  toCityOptions,
  useCuisines,
  useRestaurantIndex,
  useRestaurants,
  useVegOnlyIds,
} from "../lib/queries/catalog";
import { isOpenNow } from "../lib/format";
import { useDebounced } from "../lib/use-debounced";
import type { RestaurantSort, RestaurantSummary } from "../lib/types";

/** The API owns this list; see RestaurantSort. */
type SortKey = RestaurantSort;

const SORTS: readonly { readonly value: SortKey; readonly label: string }[] = [
  { value: "rating", label: "Top rated" },
  { value: "avg_prep_minutes", label: "Fastest" },
  { value: "price_for_two", label: "Cheapest" },
  { value: "name", label: "A–Z" },
];

/**
 * Discovery. Every filter is a real `GET /restaurants` parameter except
 * veg-only, which the restaurant row does not carry — see useVegOnlyIds.
 */
export function DiscoveryView(): React.JSX.Element {
  const [city, setCity] = React.useState("");
  const [cuisine, setCuisine] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [openNow, setOpenNow] = React.useState(false);
  const [vegOnly, setVegOnly] = React.useState(false);
  const [sort, setSort] = React.useState<SortKey>("rating");
  const [offset, setOffset] = React.useState(0);

  const debouncedSearch = useDebounced(search);

  // Any filter change puts you back on the first page; page 3 of the old
  // result set is meaningless against the new one.
  React.useEffect(() => {
    setOffset(0);
  }, [city, cuisine, debouncedSearch, openNow, sort]);

  const cuisines = useCuisines();
  const index = useRestaurantIndex();
  const restaurants = useRestaurants({
    city,
    cuisine,
    q: debouncedSearch,
    openNow,
    sort,
    offset,
  });

  const pageIds = React.useMemo(
    () => (restaurants.data?.items ?? []).map((row) => row.id),
    [restaurants.data],
  );
  const vegIds = useVegOnlyIds(pageIds, vegOnly);
  const pureVeg = React.useMemo(
    () => new Set(vegIds.data ?? []),
    [vegIds.data],
  );

  const rows = restaurants.data?.items ?? [];
  const visible = vegOnly ? rows.filter((row) => pureVeg.has(row.id)) : rows;

  const cuisineOptions = (cuisines.data ?? []).map((row) => ({
    value: row.slug,
    label: row.name,
  }));

  const total = restaurants.data?.total ?? 0;
  const countLabel = toCountLabel({ total, rows, visible, vegOnly, openNow });
  const sortLabel = SORTS.find((option) => option.value === sort)?.label ?? "";
  const cityOptions = toCityOptions(index.data);

  const hasFilters =
    city !== "" || cuisine !== "" || search !== "" || openNow || vegOnly;

  function clearFilters(): void {
    setCity("");
    setCuisine("");
    setSearch("");
    setOpenNow(false);
    setVegOnly(false);
  }


  const showResults = restaurants.isSuccess && rows.length > 0;

  return (
    <div className="flex flex-col gap-3">
      {/*
        THE FOLD IS THE POINT. The header used to be four rows — title, a
        full-width search, a rail of 44px cuisine pills, a second rail of
        toggles — then a divider and a results bar, and at 1280px not one
        kitchen photo made it above the fold. Now it is the title, the search,
        and ONE chip rail that holds sort, the filters and the cuisines, so the
        first kitchen's photo starts inside the first screen.
      */}
      <PageTitle
        subtitle={city === "" ? "Kitchens delivering now" : `Kitchens in ${city}`}
      >
        Tonight
      </PageTitle>
      <SearchField value={search} onChange={setSearch} />

      {/* Clear sits outside the rail, pinned to the right edge: inside it, it
          was the chip pushed under the fade and off the screen — exactly when
          there were filters to clear. The rail gives up its right bleed here
          so the two share the row. */}
      <search className="-ml-4 flex min-h-11 items-center gap-1">
        <div
          role="group"
          aria-label="Sort and filter kitchens"
          className={cn(RAIL, "mx-0 min-w-0 flex-1")}
        >
          <ChipSelect
            label="Sort kitchens"
            icon={<SortIcon />}
            display={
              <>
                <span className="text-ink-3">Sort:</span> {sortLabel}
              </>
            }
            options={SORTS}
            value={sort}
            onChange={(next) => {
              setSort(next as SortKey);
            }}
          />
          <FilterToggle
            label="Open now"
            pressed={openNow}
            onToggle={() => setOpenNow((current) => !current)}
          />
          <FilterToggle
            label="Pure veg"
            pressed={vegOnly}
            onToggle={() => setVegOnly((current) => !current)}
          />
          <ChipSelect
            label="City"
            display={city === "" ? "City" : city}
            placeholder="Every city"
            options={cityOptions}
            value={city}
            onChange={setCity}
            isActive={city !== ""}
          />
          <RailDivider />
          <div role="group" aria-label="Cuisine" className="flex shrink-0 gap-2">
            {cuisineOptions.map((option) => (
              <CuisineChip
                key={option.value}
                label={option.label}
                selected={cuisine === option.value}
                onSelect={() => {
                  setCuisine(cuisine === option.value ? "" : option.value);
                }}
              />
            ))}
          </div>
        </div>
        {hasFilters ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-11 shrink-0 px-2.5"
          >
            Clear
          </Button>
        ) : null}
      </search>

      {cuisines.isError ? (
        <QueryError
          title="Cuisine filter unavailable"
          error={cuisines.error}
          onRetry={() => void cuisines.refetch()}
        />
      ) : null}

      <section aria-label="Kitchens" className="flex flex-col gap-2.5">
        {showResults ? (
          <p aria-live="polite" className="font-sans text-[13px] text-ink-3">
            {countLabel}
          </p>
        ) : null}

        {restaurants.isPending ? <CardSkeletons count={6} /> : null}

        {restaurants.isError ? (
          <QueryError
            title="Could not load kitchens"
            error={restaurants.error}
            onRetry={() => void restaurants.refetch()}
          />
        ) : null}

        {restaurants.isSuccess && rows.length === 0 ? (
          // Naming the text that found nothing beats a generic "no results":
          // the usual cause is a typo or half a word, and both are visible in
          // the quoted term. The debounce means this only appears once the
          // typing has settled, not on the way through every prefix.
          <EmptyState
            title={
              debouncedSearch === ""
                ? "No kitchen matches those filters"
                : `Nothing matches “${debouncedSearch}”`
            }
            detail={
              debouncedSearch === ""
                ? "Kitchens serving your city and cuisine would be listed here, newest ratings first. Widen the search and they will come back."
                : "Try a shorter piece of the kitchen’s name, or pick a cuisine and browse instead."
            }
            action={
              hasFilters ? (
                <Button variant="outline" size="sm" onClick={clearFilters} className="h-11">
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        ) : null}

        {showResults && vegOnly && vegIds.isPending ? <CardSkeletons count={3} /> : null}

        {vegIds.isError ? (
          <QueryError
            title="Could not check which kitchens are pure veg"
            error={vegIds.error}
            onRetry={() => void vegIds.refetch()}
          />
        ) : null}

        {showResults && visible.length === 0 && !vegIds.isPending ? (
          <EmptyState
            title="No pure-veg kitchen on this page"
            detail="A kitchen counts as pure veg only when nothing on its menu is non-veg. Turn the filter off to see the other kitchens here."
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => setVegOnly(false)}
                className="h-11"
              >
                Show every kitchen
              </Button>
            }
          />
        ) : null}

        {visible.length > 0 ? (
          <ul className={GRID}>
            {visible.map((restaurant) => (
              <li key={restaurant.id} className="min-w-0">
                <RestaurantCard
                  restaurant={restaurant}
                  isPureVeg={pureVeg.has(restaurant.id)}
                />
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {restaurants.isSuccess && restaurants.data.total > DISCOVERY_PAGE_SIZE ? (
        <Pagination
          total={restaurants.data.total}
          limit={restaurants.data.limit}
          offset={restaurants.data.offset}
          onOffsetChange={setOffset}
          noun="kitchens"
          className="rounded-card border border-line bg-surface"
        />
      ) : null}

      {vegOnly ? (
        <p className="text-[12px] text-ink-3">
          Pure veg is checked per kitchen against its menu, so it narrows the
          page you are on rather than the whole list.
        </p>
      ) : null}
    </div>
  );
}

/** One kitchen per row: the app is a phone column at every viewport. */
const GRID = "grid grid-cols-1 gap-4";

/**
 * The caption above the grid. Two different truths, so it says which one it
 * is showing: veg-only is checked per kitchen against its menu and narrows the
 * current page rather than the server's total. The open count is only claimed
 * when every result is on this page; otherwise it would be a page's count
 * dressed as the whole list's.
 */
function toCountLabel({
  total,
  rows,
  visible,
  vegOnly,
  openNow,
}: {
  readonly total: number;
  readonly rows: readonly RestaurantSummary[];
  readonly visible: readonly RestaurantSummary[];
  readonly vegOnly: boolean;
  readonly openNow: boolean;
}): string {
  if (vegOnly) return `${String(visible.length)} pure veg on this page`;

  const kitchens = `${String(total)} ${total === 1 ? "kitchen" : "kitchens"}`;
  if (openNow) return `${kitchens} open now`;
  if (rows.length < total) return kitchens;

  const openCount = rows.filter((row) => isOpenNow(row.opens_at, row.closes_at)).length;
  return `${kitchens} · ${String(openCount)} open now`;
}

/** Placeholders shaped like the cards they stand in for, in the same grid. */
function CardSkeletons({ count }: { readonly count: number }): React.JSX.Element {
  return (
    <div className={GRID}>
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="flex flex-col overflow-hidden rounded-card border border-line bg-surface"
        >
          <Skeleton className="aspect-[16/10] w-full rounded-none" label="Loading kitchens" />
          <div className="flex flex-col gap-2 p-3.5">
            <Skeleton aria-hidden="true" className="h-4 w-2/3" />
            <Skeleton aria-hidden="true" className="h-3 w-1/2" />
            <Skeleton aria-hidden="true" className="h-3 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * The one large field. Its label is gone rather than hidden: "Search kitchens"
 * above a box that says what it searches is a row of pixels spent twice. The
 * aria-label carries it for a screen reader.
 */
function SearchField({
  value,
  onChange,
}: {
  readonly value: string;
  readonly onChange: (next: string) => void;
}): React.JSX.Element {
  return (
    <div className="relative w-full">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.6-3.6" />
        </svg>
      </span>
      <Input
        id="discovery-search"
        type="search"
        inputMode="search"
        autoComplete="off"
        aria-label="Search kitchens"
        placeholder="Search a kitchen or a dish"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-chip pl-9 text-[14px]"
      />
    </div>
  );
}
