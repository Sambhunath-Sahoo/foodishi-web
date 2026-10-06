/**
 * How a customer reaches a person, read from config.
 *
 * There is no support API (AD-4), so the in-app ticket form only ever wrote to
 * this browser's storage — and said, to the customer, that "nobody will
 * reply". Until a real endpoint exists the form stays off and the help surface
 * is a phone number and an address that a human actually answers.
 *
 * Each `process.env.NEXT_PUBLIC_*` is written out in full because Next inlines
 * them at build time by exact name; a computed lookup would read undefined in
 * the browser.
 *
 * Nothing here invents a number. A made-up phone in a real Bengaluru format
 * would ring a stranger, so the Call row only exists when the variable is set.
 * The email fallback is on the reserved `.example` domain, like the seeded
 * accounts, so an unconfigured build shows the shape without reaching anyone.
 */
export interface SupportContact {
  /** As dialled: digits and a leading +. Null when not configured. */
  readonly phone: string | null;
  /** As shown: spaced for reading aloud. Falls back to `phone`. */
  readonly phoneLabel: string | null;
  readonly email: string;
  /** When someone answers, said beside the number so nobody rings at 3am. */
  readonly hours: string | null;
}

const PLACEHOLDER_EMAIL = "support@foodishi.example";

function readEnv(value: string | undefined): string | null {
  return value === undefined || value.trim() === "" ? null : value.trim();
}

const phone = readEnv(process.env.NEXT_PUBLIC_SUPPORT_PHONE);

export const SUPPORT_CONTACT: SupportContact = {
  phone,
  phoneLabel: readEnv(process.env.NEXT_PUBLIC_SUPPORT_PHONE_LABEL) ?? phone,
  email: readEnv(process.env.NEXT_PUBLIC_SUPPORT_EMAIL) ?? PLACEHOLDER_EMAIL,
  hours: readEnv(process.env.NEXT_PUBLIC_SUPPORT_HOURS),
};

/**
 * The device-local ticket form, behind a flag. Off unless the variable is
 * exactly "on": a ticket nobody can read is worse than no form, so turning it
 * on should be a deliberate act once tickets reach an agent.
 */
export const IS_TICKET_FORM_ENABLED =
  process.env.NEXT_PUBLIC_SUPPORT_TICKETS === "on";
