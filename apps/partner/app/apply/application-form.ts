/**
 * The application form's rules, with no JSX around them.
 *
 * Split from the component because these are not presentation: they are the
 * API's own bounds (`RestaurantDetails` in app/schemas/catalog_admin.py),
 * restated on this side so a refusal arrives under the field instead of as a
 * banner after a round trip. Keeping them in one small module means the next
 * person comparing them against the server reads twelve lines rather than
 * hunting through four hundred of markup.
 *
 * Restating them IS a duplication, and a deliberate one: the alternative is an
 * applicant who fills in fourteen fields and learns on submit that the prep time
 * had a ceiling. The server stays the authority — nothing here is trusted, and
 * every refusal it sends is shown verbatim.
 */
import type { ApplicationSubmit } from "../../lib/types";

export const LIMITS = {
  nameMin: 2,
  cityMin: 2,
  areaMin: 2,
  addressMin: 4,
  phoneMin: 7,
  prepMin: 1,
  prepMax: 240,
} as const;

/** The API's pattern: lowercase words joined by single hyphens. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * A name as a web address.
 *
 * Suggested, never enforced: the slug is the one field an applicant cannot
 * change later without every link to them breaking, so they get to see it and
 * edit it before it is asked for.
 */
export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export interface ApplicationForm {
  readonly name: string;
  readonly slug: string;
  readonly description: string;
  readonly city: string;
  readonly area: string;
  readonly address_line: string;
  readonly latitude: string;
  readonly longitude: string;
  readonly phone: string;
  readonly price_for_two: string;
  readonly avg_prep_minutes: string;
  readonly opens_at: string;
  readonly closes_at: string;
  readonly note: string;
}

/** Trading hours a kitchen would actually pick, rather than midnight to midnight. */
export const EMPTY_FORM: ApplicationForm = {
  name: "",
  slug: "",
  description: "",
  city: "",
  area: "",
  address_line: "",
  latitude: "",
  longitude: "",
  phone: "",
  price_for_two: "",
  avg_prep_minutes: "",
  opens_at: "09:00",
  closes_at: "23:00",
  note: "",
};

function isNumberInRange(value: string, low: number, high: number): boolean {
  const parsed = Number(value);
  return value.trim() !== "" && Number.isFinite(parsed) && parsed >= low && parsed <= high;
}

/** Whether the Send button may be pressed. Never whether the server will agree. */
export function isReady(form: ApplicationForm): boolean {
  return (
    form.name.trim().length >= LIMITS.nameMin &&
    SLUG_PATTERN.test(form.slug.trim()) &&
    form.city.trim().length >= LIMITS.cityMin &&
    form.area.trim().length >= LIMITS.areaMin &&
    form.address_line.trim().length >= LIMITS.addressMin &&
    isNumberInRange(form.latitude, -90, 90) &&
    isNumberInRange(form.longitude, -180, 180) &&
    form.phone.trim().length >= LIMITS.phoneMin &&
    Number(form.price_for_two) > 0 &&
    isNumberInRange(form.avg_prep_minutes, LIMITS.prepMin, LIMITS.prepMax) &&
    form.opens_at !== "" &&
    form.closes_at !== ""
  );
}

/**
 * The form as the API's body.
 *
 * Money and coordinates stay STRINGS, exactly as every other write in this
 * console sends them: parsing a decimal into a float here would be the one place
 * in the app where a price stops being the digits somebody typed.
 */
export function toPayload(form: ApplicationForm): ApplicationSubmit {
  const optional = (value: string): string | null =>
    value.trim() === "" ? null : value.trim();
  return {
    name: form.name.trim(),
    slug: form.slug.trim(),
    description: optional(form.description),
    city: form.city.trim(),
    area: form.area.trim(),
    address_line: form.address_line.trim(),
    latitude: form.latitude.trim(),
    longitude: form.longitude.trim(),
    phone: form.phone.trim(),
    price_for_two: form.price_for_two.trim(),
    avg_prep_minutes: Number(form.avg_prep_minutes),
    opens_at: form.opens_at,
    closes_at: form.closes_at,
    note: optional(form.note),
  };
}
