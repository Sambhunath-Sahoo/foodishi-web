/**
 * The customer directory against the live API.
 *
 * `GET /users` is platform-only — it is guarded by `require_platform_role` and
 * not by the per-user `readable_user` rule the single-customer reads use, because
 * there is no `{user_id}` for anybody to own. That is the whole reason this
 * directory belongs in the operator console and nowhere else.
 *
 * No `signal` argument anywhere: unlike the partner console's services, the
 * interfaces in ../types take none, so react-query's cancellation stops at the
 * hook. Adding one here would change the seam, which is not this file's job.
 */
import { api } from "@repo/api-client";
import type { AddressRead, Page, UserRead } from "../../api-types";
import type { CustomerQuery, PeopleService } from "../types";

/**
 * A search box's empty string means "no predicate", and the API says that with
 * an absent parameter rather than an empty one: `q` is declared
 * `Query(min_length=1)`, so sending "" is a 422 instead of a wider search.
 */
function searchTerm(q: string): string | undefined {
  const term = q.trim();
  return term === "" ? undefined : term;
}

export const apiPeople: PeopleService = {
  listCustomers(query: CustomerQuery) {
    // `is_active` travels as-is because null is the same thing to both sides:
    // the fetcher drops null and undefined query values, so "either" reaches the
    // server as no parameter at all, which is exactly how the handler reads it.
    //
    // WORTH KNOWING: CustomerQuery.q promises name, email AND phone. The server
    // matches name and email only (routers/users.py list_users), so a support
    // call that opens with a phone number finds nothing here while it does
    // against the fixtures. The predicate belongs in the endpoint, not in a
    // client-side scan of a paged list.
    return api.get<Page<UserRead>>("/users", {
      query: {
        q: searchTerm(query.q),
        is_active: query.isActive,
        limit: query.limit,
        offset: query.offset,
      },
    });
  },

  getCustomer(userId) {
    return api.get<UserRead>(`/users/${userId}`);
  },

  async setCustomerActive(userId, isActive) {
    // PUT /users/{id}/active, not PATCH /users/{id}.
    //
    // This used to be a PATCH carrying `is_active`, which answered 422: the
    // server's `UserUpdate` is `extra="forbid"` and takes name, email, phone and
    // city only, because `is_active` is documented there as the server's to set.
    // No endpoint set it, for customers, at all.
    //
    // The route exists now, and it is deliberately its own route rather than a
    // field on that PATCH: PATCH /users/{id} admits the account's OWNER, so a
    // field there would have let a customer deactivate themselves. This one is
    // platform-admin only, which is the same shape as
    // PUT /restaurants/{id}/availability.
    await api.put<{ readonly id: number; readonly is_active: boolean }>(
      `/users/${String(userId)}/active`,
      { is_active: isActive },
    );
    // Re-read for the full row: the write answers with the flag alone, and the
    // customers table needs the whole customer back to re-render it.
    return api.get<UserRead>(`/users/${String(userId)}`);
  },

  listAddresses(userId): Promise<readonly AddressRead[]> {
    // Unpaginated on the server by design — a customer keeps a handful — so this
    // is a bare list and not a Page like everything else in this file.
    return api.get<readonly AddressRead[]>(`/users/${userId}/addresses`);
  },

  countCustomers(isActive) {
    // A count, taken off the envelope of a one-row page.
    //
    // `Page.total` is a COUNT(*) over the listing's own WHERE clause — see
    // core/pagination.paginate, which builds it from the same statement — so the
    // number is exact for the filter without transferring the rows it counts.
    // Walking every customer to call `.length` would be six requests at the
    // capped limit of 100 today and one more for every hundred accounts the
    // platform ever signs up, to answer a question SQL answers in one.
    //
    // One row rather than zero because `limit` is `Query(ge=1)`: a page of one is
    // the smallest window the API will accept, and its item is thrown away.
    //
    // `isActive === null` means every customer — the filter is dropped, as in
    // listCustomers above, so the total is the whole directory.
    return api
      .get<Page<UserRead>>("/users", { query: { is_active: isActive, limit: 1 } })
      .then((page) => page.total);
  },
};
