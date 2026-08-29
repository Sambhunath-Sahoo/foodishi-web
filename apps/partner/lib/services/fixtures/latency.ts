/**
 * Fixture responses are resolved on a timer, and fixture refusals ARE
 * `ApiError`s.
 *
 * Two decisions, both load-bearing:
 *
 * **The delay.** A source that answers synchronously hides every loading state
 * the console owes the kitchen — skeletons, disabled buttons, "Saving…" — and
 * those would then break the first time a real network was put behind them. A
 * small delay keeps them honest.
 *
 * **The error type.** These are @repo/api-client's own `ApiError`, not a
 * parallel class. That means `isApiError`, `toUserMessage`, `requiresSignIn`
 * and the permanent-refusal check all work on a fixture failure without
 * knowing it is one, and no screen needs a second error path. The `url` is a
 * `fixtures://` URI so a refusal in a console log still says where it came
 * from.
 */
import { ApiError } from "@repo/api-client";

const MIN_MS = 90;
const MAX_MS = 260;

function jitter(): number {
  return MIN_MS + Math.random() * (MAX_MS - MIN_MS);
}

export function settle<T>(value: T, ms = jitter()): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), ms);
  });
}

function fixtureUrl(what: string): string {
  return `fixtures://${what}`;
}

/** 404. Never a silent null handed on to a screen. */
export class NotFoundError extends ApiError {
  constructor(detail: string, what = "not-found") {
    super({ status: 404, url: fixtureUrl(what), detail, action: "show-detail" });
    this.name = "NotFoundError";
  }
}

/**
 * 403 — a door that is shut by design.
 *
 * `action: "forbidden"` is what makes the screens draw this quietly instead of
 * as a red alarm with a dead "Try again" beside it: the tap could only ever be
 * refused again.
 */
export class ForbiddenError extends ApiError {
  constructor(detail: string, what = "forbidden") {
    super({ status: 403, url: fixtureUrl(what), detail, action: "forbidden" });
    this.name = "ForbiddenError";
  }
}

/** 401 — no session. The shell redirects to sign-in rather than printing this. */
export class UnauthorizedError extends ApiError {
  constructor(detail: string, what = "session") {
    super({ status: 401, url: fixtureUrl(what), detail, action: "sign-in" });
    this.name = "UnauthorizedError";
  }
}

/** 422 — a business rule the person at the tablet can act on. */
export class UnprocessableError extends ApiError {
  constructor(detail: string, what = "validation") {
    super({ status: 422, url: fixtureUrl(what), detail, action: "show-detail" });
    this.name = "UnprocessableError";
  }
}

/** 409 — the state the caller assumed is not the state on the server. */
export class ConflictError extends ApiError {
  constructor(detail: string, what = "conflict") {
    super({ status: 409, url: fixtureUrl(what), detail, action: "show-detail" });
    this.name = "ConflictError";
  }
}
