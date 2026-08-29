import { getApiBaseUrl } from "./config";
import { ApiError, extractDetail } from "./error";
import { getAccessToken } from "./auth/session";

export type QueryValue = string | number | boolean | null | undefined;
export type QueryParams = Record<string, QueryValue | readonly QueryValue[]>;

export interface RequestOptions {
  readonly method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  readonly query?: QueryParams;
  readonly body?: unknown;
  readonly signal?: AbortSignal;
  readonly headers?: Record<string, string>;
  /** Money paths: POST /orders and POST /orders/{id}/payments. */
  readonly idempotencyKey?: string;
  /**
   * Send the bearer token when a session exists. Default true. Set false only
   * for a call that must be anonymous even while signed in — public reads do
   * not need it, because a token on a public endpoint changes nothing.
   */
  readonly auth?: boolean;
  /**
   * How long to wait before giving up, in milliseconds. Defaults to
   * DEFAULT_TIMEOUT_MS. Raise it for a deliberately slow call — a wide report
   * window — rather than removing the deadline.
   */
  readonly timeoutMs?: number;
}

/**
 * The default request deadline.
 *
 * 20 seconds because the API's own comments put a database round trip at ~180ms
 * and the widest report materialises a year of orders, so a legitimate slow call
 * is seconds, not tens of seconds — while a request still open at 20s is not
 * coming back.
 */
export const DEFAULT_TIMEOUT_MS = 20_000;

function buildUrl(path: string, query?: QueryParams): string {
  const base = getApiBaseUrl();
  const suffix = path.startsWith("/") ? path : `/${path}`;
  // Concatenated rather than resolved: `new URL("/orders", "http://h/foodishi-api")`
  // throws the base's own path away, which silently breaks every deployment
  // that serves the API under a prefix — an API gateway, or the same-origin
  // dev proxy apps/customer uses while the API ships no CORS headers.
  const url = new URL(`${base}${suffix}`);

  if (query !== undefined) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue;
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item === undefined || item === null) continue;
          url.searchParams.append(key, String(item));
        }
        continue;
      }
      url.searchParams.append(key, String(value));
    }
  }

  return url.toString();
}

/**
 * Returned when the body could not be read or parsed at all.
 *
 * Distinct from `null`, which means "there was legitimately no body" (a 204).
 * readBody used to collapse the two, so a truncated JSON response — or a
 * deadline firing part-way through response.json() — became `null as TResponse`
 * and the caller died on a property access rather than seeing an error.
 */
const UNREADABLE = Symbol("unreadable-body");

async function readBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (response.status === 204 || response.headers.get("content-length") === "0") {
    return null;
  }
  try {
    return contentType.includes("application/json")
      ? await response.json()
      : await response.text();
  } catch {
    // Kept lenient for the ERROR path, which only wants whatever it can get.
    // The success path below refuses UNREADABLE outright.
    return UNREADABLE;
  }
}

/**
 * The API runs with AUTH_ENABLED=true and 401s on the old unsigned header, so
 * it is dropped here rather than in each of the three apps at once. Remove
 * this guard when no call site passes it any more.
 */
const DEAD_DEV_HEADER = "x-dev-user-id";
let hasWarnedAboutDevHeader = false;

function stripDeadDevHeader(headers: Record<string, string>): Record<string, string> {
  const kept: Record<string, string> = {};
  let found = false;

  for (const [name, value] of Object.entries(headers)) {
    if (name.toLowerCase() === DEAD_DEV_HEADER) {
      found = true;
      continue;
    }
    kept[name] = value;
  }

  if (found && !hasWarnedAboutDevHeader && process.env.NODE_ENV !== "production") {
    hasWarnedAboutDevHeader = true;
    console.warn(
      "[api-client] X-Dev-User-Id was passed and dropped. The API now verifies " +
        "a Supabase bearer token; use SessionProvider / signIn instead.",
    );
  }

  return kept;
}

function hasAuthorization(headers: Record<string, string>): boolean {
  return Object.keys(headers).some((name) => name.toLowerCase() === "authorization");
}

async function authorizationHeader(): Promise<Record<string, string>> {
  try {
    const token = await getAccessToken();
    return token === null ? {} : { Authorization: `Bearer ${token}` };
  } catch {
    // An unconfigured or unreachable Supabase must not break public reads.
    // The API answers 401 for anything protected, which the UI can act on.
    return {};
  }
}

/**
 * The one way this monorepo talks to the API. No component calls fetch()
 * directly. Failures throw an ApiError carrying the server's own `detail`
 * so the UI can print it verbatim.
 *
 * Every call carries `Authorization: Bearer <token>` when a session exists and
 * nothing when it does not, so public endpoints keep working signed out.
 */
/**
 * Compose the caller's signal with a timeout, without requiring AbortSignal.any.
 *
 * `AbortSignal.any` is Safari 17.4+ and every partner query forwards
 * react-query's signal, so `signal` is effectively always present there — which
 * made an unguarded call throw a TypeError on an older iPad, on every request,
 * with no ApiError wrapper because the composition happened outside the try. A
 * kitchen tablet is exactly the device least likely to be current.
 *
 * `AbortSignal.timeout` is older and more widely shipped than `any`, but both are
 * feature-detected: if neither exists the caller's signal is used unchanged and
 * the request simply has no deadline, which is the previous behaviour rather than
 * a crash. `deadline` is returned so the catch can tell a timeout from an
 * unreachable host.
 */
function withDeadline(
  signal: AbortSignal | undefined,
  timeoutMs: number,
): { readonly signal: AbortSignal | undefined; readonly deadline: AbortSignal | null } {
  if (typeof AbortSignal.timeout !== "function") {
    return { signal, deadline: null };
  }
  const deadline = AbortSignal.timeout(timeoutMs);
  if (signal === undefined) return { signal: deadline, deadline };

  if (typeof AbortSignal.any === "function") {
    return { signal: AbortSignal.any([signal, deadline]), deadline };
  }

  // Manual composition for Safari < 17.4. One controller, aborted by whichever
  // input fires first; listeners are `once` so neither outlives its signal.
  const controller = new AbortController();
  const abort = (reason: unknown): void => {
    controller.abort(reason);
  };
  if (signal.aborted) abort(signal.reason);
  else if (deadline.aborted) abort(deadline.reason);
  else {
    signal.addEventListener("abort", () => { abort(signal.reason); }, { once: true });
    deadline.addEventListener("abort", () => { abort(deadline.reason); }, { once: true });
  }
  return { signal: controller.signal, deadline };
}

export async function apiFetch<TResponse>(
  path: string,
  options: RequestOptions = {},
): Promise<TResponse> {
  const {
    method = "GET",
    query,
    body,
    signal,
    headers = {},
    idempotencyKey,
    auth = true,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = options;

  const url = buildUrl(path, query);
  const caller = stripDeadDevHeader(headers);
  // A caller-supplied Authorization wins, so a one-off call can act as
  // somebody else without reaching past this module.
  const bearer = auth && !hasAuthorization(caller) ? await authorizationHeader() : {};

  const requestHeaders: Record<string, string> = {
    Accept: "application/json",
    ...bearer,
    ...caller,
  };

  if (body !== undefined) requestHeaders["Content-Type"] = "application/json";
  if (idempotencyKey !== undefined) requestHeaders["Idempotency-Key"] = idempotencyKey;

  // A DEADLINE, composed with whatever the caller passed.
  //
  // There was none, and the retry policy only fires on rejection -- so a request
  // that connected and then never answered neither settled nor retried. A
  // saturated pool or one hung `await` in a handler left every screen polling
  // GET /orders/{id}/status sitting on a skeleton forever, indistinguishable
  // from a slow network, for as long as the tab stayed open.
  const { signal: composed, deadline } = withDeadline(signal, timeoutMs);

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: composed,
    });
  } catch (cause) {
    // A timeout is not the same failure as an unreachable host, and a screen
    // that can tell them apart can say something useful about each.
    const isTimeout = deadline?.aborted === true;
    throw new ApiError({
      status: 0,
      url,
      detail: isTimeout
        ? `The Foodishi API did not respond within ${String(Math.round(timeoutMs / 1000))}s. It may be overloaded — try again.`
        : "Could not reach the Foodishi API. Check that it is running and that NEXT_PUBLIC_API_URL is correct.",
      body: cause,
    });
  }

  const payload = await readBody(response);

  if (!response.ok) {
    const forDetail = payload === UNREADABLE ? null : payload;
    const { detail, issues } = extractDetail(forDetail, response.status);
    throw new ApiError({ status: response.status, url, detail, issues, body: forDetail });
  }

  // A 2xx whose body could not be read is a failure, not an empty success.
  if (payload === UNREADABLE) {
    throw new ApiError({
      status: response.status,
      url,
      detail:
        "The API's reply was cut off before it could be read. Check the connection and try again.",
      body: null,
    });
  }

  // A 2xx must be an empty body or parsable JSON. Nothing else.
  //
  // readBody is deliberately lenient -- it falls back to text() and returns null
  // on a parse failure -- which is right for an ERROR body and wrong here,
  // because `payload as TResponse` then asserts whatever it got. A load balancer
  // answering `200 text/html` with a maintenance page was handed back typed as
  // an OrderDetail, and the caller died on `order.items.map` with "Cannot read
  // properties of undefined" instead of showing an error banner. A truncated
  // JSON body became `null as TResponse` the same way.
  if (payload === null) return payload as TResponse;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new ApiError({
      status: response.status,
      url,
      detail: `The API answered ${String(response.status)} with ${contentType || "no content type"} instead of JSON. Something between this app and Foodishi is intercepting the request.`,
      body: payload,
    });
  }

  return payload as TResponse;
}

export const api = {
  get: <TResponse>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
    apiFetch<TResponse>(path, { ...options, method: "GET" }),
  post: <TResponse>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    apiFetch<TResponse>(path, { ...options, method: "POST", body }),
  patch: <TResponse>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    apiFetch<TResponse>(path, { ...options, method: "PATCH", body }),
  put: <TResponse>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    apiFetch<TResponse>(path, { ...options, method: "PUT", body }),
  delete: <TResponse>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
    apiFetch<TResponse>(path, { ...options, method: "DELETE" }),
} as const;
