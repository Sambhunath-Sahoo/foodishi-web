"use client";

import * as React from "react";
import {
  Button,
  EmptyState,
  Input,
  PageTitle,
  Pagination,
  Select,
  cn,
} from "@repo/ui";
import { LoadingCards, QueryError } from "./data-states";
import { RestaurantCard } from "./restaurant-card";
import {
  DISCOVERY_PAGE_SIZE,
  toCityOptions,
  useCuisines,
  useRestaurantIndex,
  useRestaurants,
  useVegOnlyIds,
} from "../lib/queries/catalog";
import { useDebounced } from "../lib/use-debounced";
import type { RestaurantSort } from "../lib/types";

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

  // Two different truths, so it says which one it is showing. Veg-only is
  // checked per kitchen against its menu and therefore narrows the current page
  // rather than the server's total; claiming the total while showing a filtered
  // page would be the screen lying about its own count.
  const total = restaurants.data?.total ?? 0;
  const countLabel = vegOnly
    ? `${String(visible.length)} pure veg on this page`
    : `${String(total)} ${total === 1 ? "kitchen" : "kitchens"}`;

  const hasFilters =
    city !== "" || cuisine !== "" || search !== "" || openNow || vegOnly;

  function clearFilters(): void {
    setCity("");
    setCuisine("");
    setSearch("");
    setOpenNow(false);
    setVegOnly(false);
  }

  return (
    <div className="flex flex-col gap-4">
      {/*
        THE FOLD IS THE POINT. This header used to be five stacked full-width
        rows — a labelled search, two labelled selects, a chip row, and a
        full-width sort control — which on a 390px phone is the whole first
        screen: you opened a food app and met a form. Nothing led, because
        every control had the same weight.

        Now the order is appetite first. Search is the one large field, cuisine
        is a swipeable rail because that is the filter people actually browse
        with, and the rest folds into one short chip row. Sort drops to the
        results bar, where a sort belongs. The first kitchen card lands inside
        the fold.
      */}
      <PageTitle
        subtitle={city === "" ? "Kitchens delivering now" : `Kitchens in ${city}`}
      >
        Tonight
      </PageTitle>

      <search className="flex flex-col gap-2.5">
        <div className="relative">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-4"
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
          {/*
            The label is gone rather than hidden: "Search kitchens" above a box
            that says what it searches is a row of pixels spent twice. The
            aria-label carries it for a screen reader.
          */}
          <Input
            id="discovery-search"
            type="search"
            inputMode="search"
            autoComplete="off"
            aria-label="Search kitchens"
            placeholder="Search a kitchen or a dish"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-11 pl-9 text-[14px]"
          />
        </div>

        {/*
          The cuisine rail. Full-bleed past the shell's px-4 so the last chip is
          clipped by the screen edge rather than by a margin — that clipped edge
          is what tells you it scrolls. It scrolls inside its own container, so
          the page body never moves sideways (DESIGN.md, rule 4).
        */}
        <div
          role="group"
          aria-label="Cuisine"
          className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <CuisineChip
            label="All"
            selected={cuisine === ""}
            onSelect={() => setCuisine("")}
          />
          {cuisineOptions.map((option) => (
            <CuisineChip
              key={option.value}
              label={option.label}
              selected={cuisine === option.value}
              // Tapping the chip you are already on clears it, which is what a
              // rail with no visible clear affordance has to do.
              onSelect={() => {
                setCuisine(cuisine === option.value ? "" : option.value);
              }}
            />
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
            placeholder="Every city"
            options={toCityOptions(index.data)}
            value={city}
            onChange={setCity}
            isActive={city !== ""}
          />
          {hasFilters ? (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear
            </Button>
          ) : null}
        </div>
      </search>

      {cuisines.isError ? (
        <QueryError
          title="Cuisine filter unavailable"
          error={cuisines.error}
          onRetry={() => void cuisines.refetch()}
        />
      ) : null}

      {restaurants.isSuccess && rows.length > 0 ? (
        // The results bar. Sort lives here rather than as a full-width control
        // above the search, because a sort answers "in what order are these",
        // which is only a question once there are results to order.
        <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
          <span className="font-sans text-[13px] text-ink-3">{countLabel}</span>
          <label className="flex shrink-0 items-center gap-1.5">
            <span className="font-sans text-[12px] text-ink-4">Sort</span>
            <ChipSelect
              label="Sort kitchens"
              options={SORTS}
              value={sort}
              onChange={(next) => {
                setSort(next as SortKey);
              }}
            />
          </label>
        </div>
      ) : null}

      <section aria-label="Kitchens" className="flex flex-col gap-3">
        {restaurants.isPending ? <LoadingCards count={4} /> : null}

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
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        ) : null}

        {restaurants.isSuccess && rows.length > 0 && vegOnly && vegIds.isPending ? (
          <LoadingCards count={2} />
        ) : null}

        {vegIds.isError ? (
          <QueryError
            title="Could not check which kitchens are pure veg"
            error={vegIds.error}
            onRetry={() => void vegIds.refetch()}
          />
        ) : null}

        {restaurants.isSuccess && rows.length > 0 && visible.length === 0 && !vegIds.isPending ? (
          <EmptyState
            title="No pure-veg kitchen on this page"
            detail="A kitchen counts as pure veg only when nothing on its menu is non-veg. Turn the filter off to see the other kitchens here."
            action={
              <Button variant="outline" size="sm" onClick={() => setVegOnly(false)}>
                Show every kitchen
              </Button>
            }
          />
        ) : null}

        {visible.map((restaurant) => (
          <RestaurantCard
            key={restaurant.id}
            restaurant={restaurant}
            isPureVeg={pureVeg.has(restaurant.id)}
          />
        ))}
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
        <p className="px-1 text-[12px] text-ink-3">
          Pure veg is checked per kitchen against its menu, so it narrows the
          page you are on rather than the whole list.
        </p>
      ) : null}
    </div>
  );
}

/**
 * A native select shrunk to chip size so it sits in the row with the toggles.
 * Native on purpose — see Select: on a phone the platform picker beats anything
 * we would draw, and this only changes its clothes.
 *
 * THE CARET IS NOT DECORATION. Select sets `appearance-none`, so without it this
 * is pixel-for-pixel a pressed-state chip sitting next to two real chips, and
 * the only way to find out it opens a menu is to tap it.
 */
function ChipSelect({
  label,
  options,
  value,
  onChange,
  placeholder,
  isActive = false,
}: {
  readonly label: string;
  readonly options: readonly { readonly value: string; readonly label: string }[];
  readonly value: string;
  readonly onChange: (next: string) => void;
  readonly placeholder?: string;
  readonly isActive?: boolean;
}): React.JSX.Element {
  return (
    <span className="relative inline-flex shrink-0 items-center">
      <Select
        aria-label={label}
        placeholder={placeholder}
        options={options}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        className={cn(
          "h-9 w-auto rounded-chip pl-3 pr-7 pointer-coarse:h-11",
          "font-sans text-[13px] font-medium",
          isActive
            ? "border-accent bg-accent-soft text-accent"
            : "border-line-2 text-ink-2",
        )}
      />
      <svg
        aria-hidden="true"
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        className={cn(
          "pointer-events-none absolute right-2.5",
          isActive ? "text-accent" : "text-ink-4",
        )}
      >
        <path d="m5 9 7 7 7-7" />
      </svg>
    </span>
  );
}

/**
 * A cuisine in the rail. Selection is carried by the fill, the border AND the
 * leading dot, so it survives a colour-blind reader (DESIGN.md, rule 3).
 */
function CuisineChip({
  label,
  selected,
  onSelect,
}: {
  readonly label: string;
  readonly selected: boolean;
  readonly onSelect: () => void;
}): React.JSX.Element {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-chip border px-3 pointer-coarse:min-h-11 pointer-coarse:px-3.5",
        "font-sans text-[13px] font-medium whitespace-nowrap transition-colors cursor-pointer",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        selected
          ? "border-accent bg-accent text-on-accent"
          : "border-line-2 bg-surface text-ink-2 hover:bg-surface-2",
      )}
    >
      {selected ? (
        <span aria-hidden="true" className="size-1.5 rounded-chip bg-on-accent" />
      ) : null}
      {label}
    </button>
  );
}

/** A filter chip that reads as pressed, not just coloured. */
function FilterToggle({
  label,
  pressed,
  onToggle,
}: {
  readonly label: string;
  readonly pressed: boolean;
  readonly onToggle: () => void;
}): React.JSX.Element {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onToggle}
      className={cn(
        "inline-flex min-h-9 items-center gap-1.5 rounded-chip border px-3 pointer-coarse:min-h-11 pointer-coarse:px-3.5",
        "font-sans text-[13px] font-medium whitespace-nowrap transition-colors cursor-pointer",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        pressed
          ? "border-accent bg-accent-soft text-accent"
          : "border-line-2 bg-surface text-ink-2 hover:bg-surface-2",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-2 rounded-chip",
          pressed ? "bg-accent" : "bg-line-2",
        )}
      />
      {label}
    </button>
  );
}
