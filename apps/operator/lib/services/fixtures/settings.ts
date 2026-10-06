import type { PlatformSettings, SettingsService } from "../types";
import { settle, settleWrite, UnprocessableError } from "./latency";
import { clearSettings, readSettings, writeSettings } from "./store";

/**
 * The platform's own numbers: what delivery costs, what Foodishi keeps, what tax
 * applies, and the rules an order has to obey.
 *
 * These are the settings with money attached, so they are the ones worth
 * refusing bad values on. Each check below is a mistake somebody could plausibly
 * make in a form and which would cost real money or break a real screen:
 *
 *   a commission over 100%      the platform charging more than the food is worth
 *   free delivery below the fee free delivery on every order ever placed
 *   a free-cancellation window
 *   longer than the prep time   every order cancellable right up to handover
 *   an SLA of zero hours        every refund breached the moment it is raised
 *
 * The refusals are sentences rather than field errors because that is what the
 * reader needs: "18% is the platform default" tells them what to do, "invalid"
 * does not.
 */

const FULL_PERCENT = 100;
const MAX_SETTLEMENT_DAYS = 60;
const MAX_SLA_HOURS = 720;

function validate(next: PlatformSettings): void {
  const { commission, delivery, tax, order_rules: rules } = next;

  if (commission.default_percent <= 0 || commission.default_percent >= FULL_PERCENT) {
    throw new UnprocessableError(
      "Commission has to be more than nothing and less than the whole order.",
    );
  }
  for (const override of commission.overrides) {
    if (override.percent <= 0 || override.percent >= FULL_PERCENT) {
      throw new UnprocessableError(
        `The negotiated rate for restaurant ${String(override.restaurant_id)} has to sit between 0 and 100%.`,
      );
    }
  }
  if (commission.settlement_days < 1 || commission.settlement_days > MAX_SETTLEMENT_DAYS) {
    throw new UnprocessableError(
      `Settlement has to fall between a day and ${String(MAX_SETTLEMENT_DAYS)} days after delivery.`,
    );
  }

  const baseFee = Number.parseFloat(delivery.base_fee);
  const freeAbove = Number.parseFloat(delivery.free_delivery_above);
  if (!Number.isFinite(baseFee) || baseFee < 0) {
    throw new UnprocessableError("The delivery base fee cannot be negative.");
  }
  if (Number.isFinite(freeAbove) && freeAbove > 0 && freeAbove <= baseFee) {
    throw new UnprocessableError(
      "Free delivery has to kick in above the fee itself, or every order gets it free.",
    );
  }
  if (Number.parseFloat(delivery.surge_multiplier) < 1) {
    throw new UnprocessableError(
      "A surge multiplier under 1 would discount delivery when the platform is behind.",
    );
  }
  if (Number.parseFloat(delivery.max_distance_km) <= 0) {
    throw new UnprocessableError("The delivery radius has to be more than nothing.");
  }

  if (tax.gst_percent < 0 || tax.gst_percent >= FULL_PERCENT) {
    throw new UnprocessableError("GST has to sit between 0 and 100%.");
  }

  if (Number.parseFloat(rules.min_order_value) < 0) {
    throw new UnprocessableError("A minimum order value cannot be negative.");
  }
  if (rules.max_items_per_order < 1) {
    throw new UnprocessableError("An order has to be allowed at least one item.");
  }
  if (rules.free_cancellation_minutes < 0) {
    throw new UnprocessableError("The free cancellation window cannot run backwards.");
  }
  if (
    rules.late_cancellation_fee_percent < 0 ||
    rules.late_cancellation_fee_percent > FULL_PERCENT
  ) {
    throw new UnprocessableError(
      "A late cancellation fee has to sit between nothing and the whole order.",
    );
  }
  if (rules.refund_sla_hours < 1 || rules.refund_sla_hours > MAX_SLA_HOURS) {
    throw new UnprocessableError(
      `The refund promise has to be between an hour and ${String(MAX_SLA_HOURS)} hours. Every refund under Refunds is measured against it.`,
    );
  }
  if (rules.auto_cancel_unconfirmed_minutes < 1) {
    throw new UnprocessableError(
      "Auto-cancel needs a wait, or a kitchen loses every order it does not confirm instantly.",
    );
  }
  if (rules.prep_buffer_minutes < 0) {
    throw new UnprocessableError(
      "A negative buffer would promise a customer their food before the kitchen has cooked it.",
    );
  }
}

export const fixtureSettings: SettingsService = {
  get: () => settle(readSettings()),

  save: async (next) => {
    validate(next);
    return settleWrite(writeSettings(next));
  },

  reset: async () => settleWrite(clearSettings()),
};
