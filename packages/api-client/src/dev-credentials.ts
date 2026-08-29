/**
 * Seeded logins for development. GENERATED — do not edit by hand.
 *
 *     cd foodishi-api && uv run python -m app.seed.dev_credentials
 *
 * Every account below is created by the seeder against a development Supabase
 * project and shares one password, which is committed in this repository on
 * purpose: a development door nobody can find is a wasted morning, not a
 * security control.
 *
 * The `/creds` page in each console renders this. That page is gated on
 * NODE_ENV, so a production build ships nothing.
 *
 * Regenerate after reseeding. The list is read from the live database rather
 * than from the seeder's constants, so it cannot claim a login that does not
 * exist — but it cannot know about a password somebody changed by hand.
 */

export interface DevCredential {
  readonly email: string;
  readonly name: string;
  /** Which console this login is for. */
  readonly audience: "operator" | "restaurant" | "customer";
  /** Platform role, restaurant + role, or what makes this customer interesting. */
  readonly grant: string;
  /** False for a membership that has been revoked but kept on record. */
  readonly isActive: boolean;
}

/** Shared by every account below. */
export const DEV_PASSWORD = "foodishidev2026";

export const DEV_CREDENTIALS: readonly DevCredential[] = [
  {
    "email": "ops.admin@foodishi.internal",
    "name": "Asha Menon",
    "audience": "operator",
    "grant": "platform admin",
    "isActive": true
  },
  {
    "email": "chai.admin@foodishi.internal",
    "name": "Farah Khan",
    "audience": "restaurant",
    "grant": "Chai Point Cafe \u00b7 admin",
    "isActive": true
  },
  {
    "email": "cheese.admin@foodishi.internal",
    "name": "Nikhil Menon",
    "audience": "restaurant",
    "grant": "Cheese Republic \u00b7 admin",
    "isActive": true
  },
  {
    "email": "cheese.former@foodishi.internal",
    "name": "Deepak Shetty",
    "audience": "restaurant",
    "grant": "Cheese Republic \u00b7 staff",
    "isActive": false
  },
  {
    "email": "cheese.staff1@foodishi.internal",
    "name": "Priya Nair",
    "audience": "restaurant",
    "grant": "Cheese Republic \u00b7 staff +orders.cancel",
    "isActive": true
  },
  {
    "email": "dakshin.admin@foodishi.internal",
    "name": "Lata Rao",
    "audience": "restaurant",
    "grant": "Dakshin Diaries \u00b7 admin",
    "isActive": true
  },
  {
    "email": "dakshin.staff1@foodishi.internal",
    "name": "Suresh Kumar",
    "audience": "restaurant",
    "grant": "Dakshin Diaries \u00b7 staff +orders.reject,orders.cancel",
    "isActive": true
  },
  {
    "email": "tandoori.admin@foodishi.internal",
    "name": "Rohan Verma",
    "audience": "restaurant",
    "grant": "Tandoori Nights \u00b7 admin",
    "isActive": true
  },
  {
    "email": "tandoori.staff2@foodishi.internal",
    "name": "Imran Shaikh",
    "audience": "restaurant",
    "grant": "Tandoori Nights \u00b7 staff",
    "isActive": true
  },
  {
    "email": "tandoori.staff1@foodishi.internal",
    "name": "Meera Iyer",
    "audience": "restaurant",
    "grant": "Tandoori Nights \u00b7 staff +orders.reject",
    "isActive": true
  },
  {
    "email": "wok.admin@foodishi.internal",
    "name": "Kevin Dsouza",
    "audience": "restaurant",
    "grant": "Wok This Way \u00b7 admin",
    "isActive": true
  },
  {
    "email": "wok.staff1@foodishi.internal",
    "name": "Anita Bose",
    "audience": "restaurant",
    "grant": "Wok This Way \u00b7 staff",
    "isActive": true
  },
  {
    "email": "ishita.iyer2@example.com",
    "name": "Ishita Iyer",
    "audience": "customer",
    "grant": "customer",
    "isActive": true
  },
  {
    "email": "lakshmi.reddy75@example.com",
    "name": "Lakshmi Reddy",
    "audience": "customer",
    "grant": "customer",
    "isActive": true
  },
  {
    "email": "meera.joshi9@example.com",
    "name": "Meera Joshi",
    "audience": "customer",
    "grant": "customer",
    "isActive": true
  },
  {
    "email": "nikhil.reddy149@example.com",
    "name": "Nikhil Reddy",
    "audience": "customer",
    "grant": "customer",
    "isActive": true
  },
  {
    "email": "rohan.desai3@example.com",
    "name": "Rohan Desai",
    "audience": "customer",
    "grant": "customer",
    "isActive": true
  },
  {
    "email": "rohan.pillai0@example.com",
    "name": "Rohan Pillai",
    "audience": "customer",
    "grant": "customer",
    "isActive": true
  },
  {
    "email": "tanvi.pillai1@example.com",
    "name": "Tanvi Pillai",
    "audience": "customer",
    "grant": "customer",
    "isActive": true
  }
];
