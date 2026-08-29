/**
 * The API writes its failures for humans:
 *   { "detail": "Order must be at least 599 to use this coupon" }
 * FastAPI validation errors arrive as an array instead. Both are carried
 * through to the UI verbatim — never replaced with "Something went wrong".
 */
export interface ValidationIssue {
  readonly loc?: readonly (string | number)[];
  readonly msg?: string;
  readonly type?: string;
}

/**
 * What the UI should *do* about a failure, decided here so no screen has to
 * pattern-match on status codes. A 401 is not a message to print — it is a
 * redirect to /login.
 */
export type ApiErrorAction =
  /** No session, or the token expired past refresh. Send them to /login. */
  | "sign-in"
  /** Signed in, but this identity has no public.users profile yet. POST /auth/link. */
  | "link-profile"
  /** Signed in and linked, but not allowed to act here. Show the detail. */
  | "forbidden"
  /** Nothing to do but show the server's own words. */
  | "show-detail";

const ME_PATH_PATTERN = /\/me(\/|$|\?)/;

function decideAction(status: number, url: string): ApiErrorAction {
  if (status === 401) return "sign-in";
  if (status === 403) return "forbidden";
  // A 404 from /me* is the linking gap, not a missing record: the identity is
  // valid but no profile is joined to it. The server's detail already names
  // /auth/link, and it is carried through untouched.
  if (status === 404 && ME_PATH_PATTERN.test(url)) return "link-profile";
  return "show-detail";
}

export class ApiError extends Error {
  readonly status: number;
  readonly url: string;
  /** The server's own `detail`, already flattened to one readable string. */
  readonly detail: string;
  readonly issues: readonly ValidationIssue[];
  readonly body: unknown;
  /** What a UI should do about this, so no screen switches on raw status codes. */
  readonly action: ApiErrorAction;
  /** True when the caller must sign in again. The UI redirects; it does not print. */
  readonly requiresSignIn: boolean;
  /** True when a signed-in identity still needs POST /auth/link. */
  readonly requiresProfileLink: boolean;

  constructor(init: {
    status: number;
    url: string;
    detail: string;
    issues?: readonly ValidationIssue[];
    body?: unknown;
    action?: ApiErrorAction;
  }) {
    super(init.detail);
    this.name = "ApiError";
    this.status = init.status;
    this.url = init.url;
    this.detail = init.detail;
    this.issues = init.issues ?? [];
    this.body = init.body;
    this.action = init.action ?? decideAction(init.status, init.url);
    this.requiresSignIn = this.action === "sign-in";
    this.requiresProfileLink = this.action === "link-profile";
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

const STATUS_FALLBACKS: Record<number, string> = {
  401: "Your session has expired. Sign in again to continue.",
  403: "You are not permitted to do that.",
  404: "Not found.",
  409: "That conflicts with the current state of this record.",
  429: "Too many requests. Wait a moment and try again.",
  500: "The server hit an unexpected error.",
  503: "The service is unavailable right now.",
};

function describeIssue(issue: ValidationIssue): string {
  const field = issue.loc?.filter((part) => part !== "body").join(".");
  const message = issue.msg ?? "is invalid";
  return field !== undefined && field !== "" ? `${field}: ${message}` : message;
}

/** Pull the human-readable reason out of whatever shape the server sent. */
export function extractDetail(
  body: unknown,
  status: number,
): { detail: string; issues: readonly ValidationIssue[] } {
  if (typeof body === "string" && body.trim() !== "") {
    return { detail: body, issues: [] };
  }

  if (typeof body === "object" && body !== null && "detail" in body) {
    const raw = (body as { detail: unknown }).detail;

    if (typeof raw === "string" && raw.trim() !== "") {
      return { detail: raw, issues: [] };
    }

    if (Array.isArray(raw)) {
      const issues = raw as readonly ValidationIssue[];
      const detail = issues.map(describeIssue).join("; ");
      if (detail !== "") return { detail, issues };
    }
  }

  return {
    detail: STATUS_FALLBACKS[status] ?? `Request failed with status ${status}.`,
    issues: [],
  };
}

/** True when the caller has no valid session and the UI should redirect to sign-in. */
export function requiresSignIn(error: unknown): boolean {
  return isApiError(error) && error.requiresSignIn;
}

/** True when a signed-in identity has no linked profile yet — POST /auth/link. */
export function requiresProfileLink(error: unknown): boolean {
  return isApiError(error) && error.requiresProfileLink;
}

/** What the UI should show for any thrown value, API error or not. */
export function toUserMessage(error: unknown): string {
  if (isApiError(error)) return error.detail;
  if (error instanceof Error && error.message !== "") return error.message;
  return "The request could not be completed.";
}
