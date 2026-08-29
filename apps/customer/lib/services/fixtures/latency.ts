/**
 * Fixture responses are resolved on a timer, not immediately.
 *
 * A source that answers synchronously hides every loading state the UI owes
 * the customer — skeletons, disabled buttons, "Building cart…" — and those
 * would then break the first time a real network was put behind them. A small
 * delay keeps them honest and keeps the app feeling like itself.
 */
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

/**
 * Failures the fixture source raises.
 *
 * `detail` and `status` are the fields @repo/api-client's `toUserMessage`
 * reads, so a fixture refusal prints through the same path as a real 404 or
 * 422 and the screens need no second error shape.
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

/** The server's 422: a business rule the customer can act on. */
export class UnprocessableError extends FixtureError {
  constructor(detail: string) {
    super(422, detail);
    this.name = "UnprocessableError";
  }
}

export class ConflictError extends FixtureError {
  constructor(detail: string) {
    super(409, detail);
    this.name = "ConflictError";
  }
}
