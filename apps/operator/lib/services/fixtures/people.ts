import type { AddressRead, UserRead } from "../../api-types";
import type { PeopleService } from "../types";
import { NotFoundError, settle, settleWrite } from "./latency";
import { matches, toPage } from "./paging";
import { SEED_ADDRESSES } from "./seed";
import { allCustomers, findCustomer, setCustomerSwitch } from "./store";

/**
 * The customer directory, and the one control the console has over an account.
 *
 * The search runs over name, email and phone rather than name alone: a support
 * call opens with a phone number far more often than with a spelling, and a
 * search box that quietly only looked at one column is worse than no search.
 *
 * The rows are ordered oldest account first, which is the order the directory's
 * footer claims. Nothing here sorts by spend — that would mean summing every
 * customer's orders to draw one page, which is why the table says so and the
 * per-customer panel does the summing for one person at a time.
 */

function requireCustomer(userId: number): UserRead {
  const customer = findCustomer(userId);
  if (customer === null) {
    throw new NotFoundError(`No customer with id ${String(userId)}.`);
  }
  return customer;
}

function selectCustomers(q: string, isActive: boolean | null): readonly UserRead[] {
  const term = q.trim();
  return allCustomers().filter((customer) => {
    if (isActive !== null && customer.is_active !== isActive) return false;
    if (term === "") return true;
    return (
      matches(customer.name, term) ||
      matches(customer.email, term) ||
      matches(customer.phone, term)
    );
  });
}

export const fixturePeople: PeopleService = {
  listCustomers: (query) =>
    settle(toPage(selectCustomers(query.q, query.isActive), query)),

  getCustomer: async (userId) => settle(requireCustomer(userId)),

  setCustomerActive: async (userId, isActive) => {
    requireCustomer(userId);
    setCustomerSwitch(userId, isActive);
    return settleWrite(requireCustomer(userId));
  },

  listAddresses: (userId): Promise<readonly AddressRead[]> =>
    settle(SEED_ADDRESSES.filter((address) => address.user_id === userId)),

  countCustomers: (isActive) => settle(selectCustomers("", isActive).length),
};
