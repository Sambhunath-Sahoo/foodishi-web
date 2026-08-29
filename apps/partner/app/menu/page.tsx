"use client";

import * as React from "react";
import { PageTitle, SegmentedControl } from "@repo/ui";
import { CategoryPanel } from "./category-panel";
import { DishTable } from "./dish-table";
import { ModifierPanel } from "./modifier-panel";
import { KitchenGate } from "../_components/kitchen-gate";
import { CardSkeletons, LoadError } from "../_components/states";
import { useMenu } from "../../lib/queries/menu";
import type { ReadyKitchen } from "../../lib/kitchen";

type Tab = "dishes" | "categories" | "addons";

function Menu({ kitchen }: { readonly kitchen: ReadyKitchen }): React.JSX.Element {
  const [tab, setTab] = React.useState<Tab>("dishes");
  const menu = useMenu(kitchen);

  const categories = menu.data ?? [];

  // The two structural tabs are a manager's. A shift worker gets the dish table
  // and nothing else, which is the whole tab strip gone — so it is not drawn.
  const tabs: readonly { readonly value: Tab; readonly label: string; count?: number }[] =
    [
      { value: "dishes", label: "Dishes", count: categories.flatMap((c) => c.items).length },
      ...(kitchen.can("menu.categories")
        ? [{ value: "categories" as const, label: "Categories", count: categories.length }]
        : []),
      ...(kitchen.can("menu.modifiers")
        ? [{ value: "addons" as const, label: "Add-ons & variants" }]
        : []),
    ];

  return (
    <div className="flex flex-col gap-4">
      {tabs.length > 1 ? (
        <SegmentedControl
          ariaLabel="Which part of the menu"
          options={tabs}
          value={tab}
          onValueChange={setTab}
        />
      ) : null}

      {menu.isPending ? <CardSkeletons count={2} label="Loading the menu" /> : null}

      {menu.error !== null ? (
        <LoadError
          error={menu.error}
          title="Could not load the menu"
          onRetry={() => {
            void menu.refetch();
          }}
        />
      ) : null}

      {menu.data !== undefined ? (
        <>
          {tab === "dishes" ? (
            <DishTable kitchen={kitchen} categories={categories} />
          ) : null}
          {tab === "categories" ? (
            <CategoryPanel kitchen={kitchen} categories={categories} />
          ) : null}
          {tab === "addons" ? (
            <ModifierPanel kitchen={kitchen} categories={categories} />
          ) : null}
        </>
      ) : null}
    </div>
  );
}

/**
 * The menu, in three tabs that are three different jobs: the dishes a cook
 * touches mid-service, the categories a manager sets once a season, and the
 * add-ons that decide what a dish can even be ordered as.
 *
 * The gate is `menu.view`, which everybody who can open this console holds. What
 * each tab lets somebody DO is decided per control, not per screen — a shift
 * worker sees every dish and can sell any of them out, and cannot rename one.
 */
export default function MenuPage(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-4">
      <PageTitle subtitle="Turn a dish off the moment it runs out — customers stop seeing it straight away. Prices, photos, categories and add-ons live here too.">
        Menu
      </PageTitle>

      <KitchenGate loadingCards={2} loadingLabel="Loading the menu" requires="menu.view">
        {(kitchen) => <Menu kitchen={kitchen} />}
      </KitchenGate>
    </div>
  );
}
