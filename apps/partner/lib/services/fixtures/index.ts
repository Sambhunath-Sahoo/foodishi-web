import type { PartnerServices } from "../types";
import { fixtureApplications } from "./applications";
import { fixtureIdentity } from "./identity";
import { fixtureMenu } from "./menu";
import { fixtureOffers } from "./offers";
import { fixtureOrders } from "./orders";
import { fixturePayments } from "./payments";
import { fixtureReports } from "./reports";
import { fixtureRestaurant } from "./restaurant";
import { fixtureStaff } from "./staff";

export const fixtureServices: PartnerServices = {
  identity: fixtureIdentity,
  applications: fixtureApplications,
  orders: fixtureOrders,
  menu: fixtureMenu,
  restaurant: fixtureRestaurant,
  staff: fixtureStaff,
  offers: fixtureOffers,
  reports: fixtureReports,
  payments: fixturePayments,
  sourceName: "fixtures",
};

export { resetFixtures } from "./store";
export { listSampleAccounts, type SampleAccount } from "./samples";
