/**
 * Fixture answers arrive on a timer, not immediately.
 *
 * A source that resolves synchronously hides every loading state the console
 * owes its reader — the skeleton boards, the disabled save button, the "still
 * checking" chip on the SLA watch — and those would then break the first time a
 * real network was put behind them. A small delay keeps them honest and keeps
 * the console feeling like itself.
 *
 * Writes are given a longer delay than reads on purpose: a save that returns in
 * 4ms makes a pending button flash, which reads as a bug rather than as work.
 */
const READ_MIN_MS = 80;
const READ_MAX_MS = 240;
const WRITE_MIN_MS = 220;
const WRITE_MAX_MS = 420;

function jitter(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function settle<T>(value: T): Promise<T> {
  return delayed(value, jitter(READ_MIN_MS, READ_MAX_MS));
}

/** For anything that changes state, so the pending affordance is visible. */
export function settleWrite<T>(value: T): Promise<T> {
  return delayed(value, jitter(WRITE_MIN_MS, WRITE_MAX_MS));
}

function delayed<T>(value: T, ms: number): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(value);
    }, ms);
  });
}

/**
 * A refusal from the fixture source.
 *
 * `status` and `detail` are the two fields @repo/api-client's `toUserMessage`
 * reads, so a fixture refusal prints through exactly the same path as a real
 * 404 or 422 and no screen needs a second error shape. `message` carries the
 * detail as well, which is what makes the fallback branch of `toUserMessage`
 * produce the same sentence.
 */
export class FixtureError extends Error {
  readonly status: number;
  readonly detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = "FixtureError";
    this.status = status;
    this.detail = detail;
  }
}

export class NotFoundError extends FixtureError {
  constructor(detail: string) {
    super(404, detail);
    this.name = "NotFoundError";
  }
}

/** The server's 422: a business rule the reader can act on. */
export class UnprocessableError extends FixtureError {
  constructor(detail: string) {
    super(422, detail);
    this.name = "UnprocessableError";
  }
}

/**
 * The server's 409: the state the caller assumed is not the state here.
 *
 * Distinct from 422 because it is not the request that is wrong — it is the row,
 * and usually because somebody else got there first. The application queue is
 * the case that needed it: two operators working the same list, and the second
 * one has to be told the answer was already given rather than overwrite it.
 */
export class ConflictError extends FixtureError {
  constructor(detail: string) {
    super(409, detail);
    this.name = "ConflictError";
  }
}

/** The server's 401: nobody is signed in, or the credentials were wrong. */
export class UnauthorizedError extends FixtureError {
  constructor(detail: string) {
    super(401, detail);
    this.name = "UnauthorizedError";
  }
}
