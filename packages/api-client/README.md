# @repo/api-client

The only way the three apps talk to the Foodishi API. No component calls `fetch()`
directly.

## Generated types

```bash
pnpm --filter @repo/api-client gen
```

Runs `openapi-typescript $NEXT_PUBLIC_API_URL/openapi.json -o src/types/api.d.ts`,
defaulting to `http://localhost:8000`. The API must be running:

```bash
cd ../foodishi-api && uv run fastapi dev
```

`src/types/api.d.ts` is generated, not hand-written. Re-run `gen` after any
backend change — a changed response shape then surfaces as a TypeScript error
in all three apps instead of a runtime bug in one.

## Exports

| Export | What it is |
|---|---|
| `apiFetch`, `api.get/post/patch/put/delete` | typed fetch wrapper over `NEXT_PUBLIC_API_URL` |
| `getApiBaseUrl` | reads the env var; throws in production if unset |
| `ApiError`, `isApiError`, `extractDetail`, `toUserMessage` | carry the server's own `detail` to the UI |
| `ApiProvider`, `createQueryClient` | TanStack Query provider; no retry on 4xx |
| `signIn`, `signUp`, `signOut`, `getSession`, `getAccessToken`, `getAuthUser`, `onAuthChange` | Supabase auth, session-backed |
| `SessionProvider`, `useSession` | the session, the `/me` profile, and the two verbs |
| `RequireAuth`, `AuthSpinner` | the gate a signed-in screen sits behind |
| `linkProfile`, `fetchMyProfile`, `fetchMyRestaurants` | `POST /auth/link`, `GET /me`, `GET /me/restaurants` |
| `getSupabaseClient`, `getSupabaseConfig`, `isSupabaseConfigured` | the browser client singleton |
| `requiresSignIn`, `requiresProfileLink` | what to *do* about a 401 or an unlinked 404 |
| ~~`getUserId` / `setUserId` / `getRestaurantId` / `setRestaurantId`~~ | **deprecated** phase-1 dev identity |
| ~~`getIdentity`, `subscribeToIdentity`, `clearIdentity`, `requireUserId`, `requireRestaurantId`~~ | **deprecated** rest of that stand-in |
| `paths`, `operations`, `components` | generated OpenAPI types |

## Errors

The API writes its failures for humans. `ApiError.detail` is that string —
*"Order must be at least 599 to use this coupon"* — already flattened from
either a `detail` string or a FastAPI validation array. Show it verbatim.
Never replace it with "Something went wrong".

## Authentication

The API runs with `AUTH_ENABLED=true`. It verifies a Supabase ES256 access
token against the project JWKS and answers 401 to anything else — including the
old `X-Dev-User-Id` header, which is dead.

### Configuration

Each app needs both public Supabase variables in its `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
```

They come from the API's `.env` (`SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`).
**`SUPABASE_SECRET_KEY` never goes in a frontend app** — it bypasses RLS
entirely. A missing variable throws by name at sign-in rather than surfacing as
an opaque 401 three screens later.

### The token

`apiFetch` attaches `Authorization: Bearer <token>` to every call when a session
exists and sends nothing when it does not, so public endpoints keep working
signed out. The token is read through `getAccessToken()` on each request and
never cached: supabase-js refreshes the hour-lived JWT behind `getSession()`,
and a cached copy would work for an hour and then 401 everything.

Pass `auth: false` on a request that must stay anonymous while signed in.

### Wiring an app

```tsx
// app/layout.tsx
<ApiProvider>
  <SessionProvider>{children}</SessionProvider>
</ApiProvider>

// a protected screen
<RequireAuth onRedirect={(to) => router.replace(to)}>
  <Dashboard />
</RequireAuth>

// anywhere below the provider
const { session, user, profile, status, signIn, signOut } = useSession();
```

`status` is `"loading" | "authenticated" | "unauthenticated"`. Branch on
`"loading"` — treating it as signed-out flashes the login screen on every
refresh.

### A new signup has no profile

Supabase proves *who is calling*; `public.users` says *which Foodishi profile that
is*. A brand-new account has no join between them, so `GET /me` returns 404 with
a detail naming `/auth/link`. `useSession().profileStatus` reports that as
`"unlinked"`; call `linkProfile({ name, phone, city })` — idempotent, and the
email comes from the verified token, never the body — then `refreshProfile()`.

### A 401 is a redirect, not a message

`ApiError.action` says what a UI should do, so no screen switches on raw status
codes:

| `action` | When | What to do |
|---|---|---|
| `sign-in` | 401 | redirect to `/login` |
| `link-profile` | 404 from `/me*` | `POST /auth/link` |
| `forbidden` | 403 | show `detail` |
| `show-detail` | everything else | show `detail` |

`error.requiresSignIn` and `error.requiresProfileLink` are the two booleans, and
`requiresSignIn(error)` / `requiresProfileLink(error)` the guards for an
`unknown`. The server's `detail` is carried through untouched in every case.

## Identity is not authentication

`identity.ts` is a **deprecated phase-1 stand-in** for decision D2. It fed the
unsigned `X-Dev-User-Id` header, which the API no longer accepts and which
`apiFetch` now strips. It is exported only so the three apps compile while
their call sites move to `SessionProvider` / `useSession`. Delete it once
nothing imports it.
