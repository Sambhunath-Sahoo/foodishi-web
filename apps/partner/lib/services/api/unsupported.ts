/**
 * The routes the Foodishi API does not have yet.
 *
 * Reports, payouts and the rest have since shipped; what is left (changing your
 * own password here; offers and coupon delete refuse in ./offers.ts) is served
 * by the fixtures only. There is nothing behind them on the real API.
 *
 * So the API implementation refuses, loudly, and names the endpoint it wanted.
 * The alternative — returning an empty array — would draw "no offers yet" over
 * a restaurant that has ten, and somebody would spend an afternoon on it. A
 * refusal that names the missing route is one sentence and costs nobody an
 * afternoon.
 *
 * Delete each block below as its route lands.
 */
import { ApiError } from "@repo/api-client";

export function notImplemented(endpoint: string, surface: string): never {
  throw new ApiError({
    status: 501,
    url: endpoint,
    detail: `${surface} is not available against the live API yet — ${endpoint} does not exist. Run with NEXT_PUBLIC_DATA_SOURCE=fixtures to work on this screen, and delete the refusal in lib/services/api/unsupported.ts when the route ships.`,
    action: "show-detail",
  });
}
