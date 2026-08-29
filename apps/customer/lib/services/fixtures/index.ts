import type { FoodishiServices } from "../types";
import { fixtureCatalog } from "./catalog";
import { fixtureOrders } from "./orders";

export const fixtureServices: FoodishiServices = {
  catalog: fixtureCatalog,
  orders: fixtureOrders,
  sourceName: "fixtures",
};

export { resetFixtures } from "./store";
