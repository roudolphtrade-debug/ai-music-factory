# Member accounts: backend set-up

The app talks to one Supabase project, **aimf-dev** (reference `liewjcwkogoesgxcuyff`). No Lovable
Cloud, no server secret: the browser only holds the project URL and the **publishable** key, and
what belongs to a member is protected in the database by row-level security.

The migration of section 2 **has been applied** to aimf-dev by the owner (see "Remote state" at the end).
The other steps below are done once, by the owner.

## 1. Environment variables (browser-safe values only)

Exactly two variables exist. Both are public by nature (they end up in the JavaScript sent to every
visitor), which is why only these two are allowed:

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://liewjcwkogoesgxcuyff.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | the *publishable* key, `sb_publishable_…`, from **Project Settings → API Keys** |

They are read **when the app is built or started**, not at runtime: changing one means restarting the
dev server or rebuilding.

**The versioned `.env`.** The two values of aimf-dev are written in `.env` at the root of the project,
**on purpose and committed**. Both are public by nature: the key is a *publishable* one, protected by row-level
security and not by secrecy, and it ends up in the JavaScript sent to every visitor. Lovable reads `.env` for its
preview and its published site (its documentation: `VITE_` values live in `.env`, never in its Secrets panel,
and `.env` must not be ignored by Git). `src/auth/hygiene.test.ts` fails if `.env` holds any name other than
these two, if the key is not a publishable one, or if `.gitignore` ignores `.env` again.

Every other variant stays out of Git: `.env.local`, `.env.production`, any `.env.*` and `*.local` are ignored.
`.env.example` only documents the names.

**Local work.** Nothing to set up: `npm run dev` (port 8080) reads `.env`. To use another project or key on one
machine only, copy `.env.example` to **`.env.local`**: it wins over `.env` and is never committed.

**Lovable preview and published site.** Nothing to define in Lovable: `.env` is read as it is. Do not enable
Lovable Cloud and do not use Settings, General, External Supabase, Connect: the app reads the two values
itself, and that flow could rewrite `.env` and `src/integrations/supabase/` (not verified). After the merge,
check in the Code tab that `.env` is there with the two names, open the preview in its own browser tab, and run
the test of section 4. Also add the preview address to the Redirect URLs of section 3, or confirmation links
and the return from Google will be refused.

**Never** put in the repository or in a `VITE_` variable: a secret key (`sb_secret_…`), the legacy
`service_role` key, the database password or any SMTP credential. An automated test
(`src/auth/hygiene.test.ts`) fails if one appears in the source, the SQL, `.env`, `.env.example` or the docs.

**Without the two variables** the app still works: the account pages explain that accounts are not
available yet, no request leaves the browser, and public listening and discovery are untouched.

## 2. Database

Run `migrations/20261024090000_member_profiles.sql` once in the SQL editor of the project.
It creates `public.profiles`, its policies, and the trigger that gives every new account a profile.
Then run `verify/member_profiles_rls_test.sql` in the same editor: it works inside a transaction that
is rolled back, and every row of its result must read `ok = true` (35 rows: 34 checks, then a last row
that asserts the exact number of checks and that none is false or null). Each "refused" check waits for
one precise SQLSTATE (42501, 23514 or 23505), never for "any error". If the script stops on an error,
nothing was committed: run `rollback;`, check that no `@example.invalid` account is left (the header of the
script gives the two queries), fix the cause, run again.

### What the migration guarantees (reviewed)

| Point | How |
|---|---|
| One private profile per member | `profiles.id` is the primary key and references `auth.users(id)`. |
| Nobody reads anyone else's profile, visitors read none | RLS on; `anon` has no privilege at all; `authenticated` can select only `id = auth.uid()`. |
| A member writes only their own row | Insert and update policies check `id = auth.uid()`; **column grants** exclude `id`, `created_at` and `updated_at`. |
| No delete from the app | No `delete` grant. The row disappears with the account. |
| Deleting an account deletes its profile | `on delete cascade` on `auth.users(id)`. Delete test accounts in **Authentication → Users**. A member cannot yet delete their own account from the app: self-service deletion is a **requirement before any public opening** (server-side function, see `docs/member-auth/EXIGENCES-ET-PARCOURS.md`). |
| The trigger cannot be abused | `handle_new_user()` is `security definer` with an empty `search_path`, its execute right is revoked from `public`, `anon` and `authenticated`, and it reads the e-mail address only, never the user-editable `raw_user_meta_data`. |
| Artist and label are optional and combinable | `creator_roles text[]` defaults to empty (= listener); the check allows `artist`, `label`, or both. |
| Artist and label grant nothing | They are a declared label. No policy, function or role reads them; there is no admin or permission column. Tests assert it. |
| Avatar is optional and safe | `avatar_url` accepts only `https://` addresses (never `javascript:`, `data:` or `http:`). No upload yet. |
| Handles | Optional, `^[a-z0-9_]{3,24}$`, unique. A refused duplicate reveals that a handle is taken: unavoidable for a unique handle. |

Why the app updates the row instead of upserting: `supabase-js` `.upsert()` writes `id` in its
`SET` list, and members may not write `id`, so the database refuses it. The app therefore does a plain
`update` of the member's own row, and a plain `insert` only if the trigger never created one.

Limits worth knowing: the check on `creator_roles` accepts a repeated value such as
`{artist,artist}` (harmless, the app never sends it); the verification script and the local checks
run on a plain PostgreSQL, not on the hosted project, so run the script there once.

## 3. Authentication settings (dashboard → Authentication)

| Setting | Value |
|---|---|
| Site URL | the published address of the app |
| Redirect URLs | the published address, any custom domain, the Lovable preview address, and `http://localhost:8080/**` for local work (patterns ending in `/**`). The app sends members to `/auth/confirm` and `/auth/reset-password` from mails, and to `/auth/sign-in` when they come back from Google |
| Confirm email | **on** (members must confirm their address before signing in) |
| Password rules | minimum length **12** and required characters **lowercase, uppercase letters, digits and symbols**: see 3.1 (the app enforces the same rules and also refuses more than 72 bytes, the limit of the service) |
| Leaked-password protection | **Pro plan or above only**: not available on the current Free plan, not enabled, never switched on without the owner's decision (see 3.1) |
| Google sign-in | off until configured by the owner: see 3.2 |
| Email OTP expiry | the default (3600 s) or shorter; an expired link shows a clear message and a resend form |
| Custom SMTP | the owner's provider, configured in **Authentication → SMTP Settings** only. The credentials stay in the dashboard |

The remote settings are not changed from this repository. The browser form checks the password policy
and shows it, but **only the project's own settings protect it**: anyone calling the authentication API
directly bypasses the form. If a setting is looser than the form, the app still refuses; if it is stricter,
the app shows its general "refused, too weak" message for what the service rejects.

### 3.1 Password rules: what the service can enforce (checked against the current Supabase documentation)

The policy decided for the app: **12 characters at least, one uppercase letter, one lowercase letter, one
digit and one symbol**.

| Protection | Available in Supabase | Plan | State on aimf-dev (organisation plan: Free) |
|---|---|---|---|
| Minimum password length | yes | all plans | set by the owner to 12; **enforced by the service, proved on 2026-10-25** by a direct call (see "Proof" below); the setting itself is not readable from here |
| Required characters: lowercase, uppercase letters, digits **and symbols** (the strongest option) | yes | all plans | set by the owner; **enforced by the service, proved on 2026-10-25** by direct calls (see "Proof" below) |
| Refusal of leaked passwords (HaveIBeenPwned "Pwned Passwords" check, which also covers the most common passwords) | yes | **Pro plan and above: paid** | **not available and not enabled** on the Free plan. Nothing was switched on or subscribed |
| A separate dictionary of common passwords | **not described in the documentation**: the leaked-password check above is the only protection of that kind | | none |

How the app relates to it: the browser form applies the same four classes (ASCII letters and digits, the
service's own 32 symbols, see `PASSWORD_SYMBOLS` in `src/auth/password.ts`) so that what the form accepts the
service accepts. When the service refuses a password anyway, the app says so under the field: "refused, too weak" in
general, or "appears in known data leaks" when the service gives that reason (only possible once the
leaked-password check exists on the project). **Without the paid check, nothing server-side refuses
common or compromised passwords such as `Password123!`: it follows every rule.**

Existing accounts keep signing in with their current password even if it would not meet the new rules (the
sign-in form has no rule). The rules apply to new passwords: sign-up and the reset form.

**Steps for the owner (Free plan, nothing to pay; done by the owner, kept for reference):**

1. Dashboard of the project `liewjcwkogoesgxcuyff` → **Authentication** → **Sign In / Providers** → **Email**
   (direct link: `https://supabase.com/dashboard/project/liewjcwkogoesgxcuyff/auth/providers?provider=Email`).
2. **Minimum password length**: `12`.
3. **Password Requirements**: the strongest option, "lowercase, uppercase letters, digits and symbols".
4. Leave **Prevent use of leaked passwords** off: it is greyed out or refused on the Free plan. Switching
   to a paid plan is a separate decision, not needed for the app to work.
5. **Save**. (Option labels may differ slightly from these names; the intent is the strongest option.)
6. Do **not** enable "Require current password when changing password" without testing the reset form
   first: a member who forgot their password has no current password to give. I have not verified how the
   recovery session behaves with it.

**Check that the service really enforces it** (with an address you own and a throw-away password; the
request must be refused before anything is created):

```bash
curl -s -X POST "https://liewjcwkogoesgxcuyff.supabase.co/auth/v1/signup" \
  -H "apikey: <publishable key>" -H "Content-Type: application/json" \
  -d '{"email":"<an address you own>","password":"alllowercase1234"}'
```

Expected: HTTP **422**, `error_code` `weak_password`, and `"reasons":["characters"]`. If it answers **200**,
the setting is not active and an unconfirmed test user was created: delete it in **Authentication → Users**,
fix the setting, retry.

**Proof (2026-10-25, aimf-dev).** Five direct `POST /auth/v1/signup` calls with the publishable key, throw-away
passwords and `@example.invalid` addresses, no form involved. All five were refused by the service and no
account was created (the users, identities, profiles and sessions counts were the same before and after):

| Password | HTTP | `error_code` | `reasons` |
|---|---|---|---|
| 7 characters, all four classes | 422 | `weak_password` | `length` |
| no uppercase letter | 422 | `weak_password` | `characters` |
| no lowercase letter | 422 | `weak_password` | `characters` |
| no digit | 422 | `weak_password` | `characters` |
| no symbol | 422 | `weak_password` | `characters` |

Not proved by a call: the same refusal on the reset form (`PUT /user` with a recovery session). The setting is
global to the project, so it is expected, but it was not exercised separately. The leaked-password check stays
off (Free plan), so a common password that follows every rule is still accepted.

### 3.2 Google sign-in

The app has the Google sign-in, **hidden until the project really has Google switched on**. It asks the
project (`GET /auth/v1/settings`, public) and shows the "Continue with Google" button, in the six languages,
only when `external.google` is true. A doubt (no answer, a refusal) means no button. **On 2026-10-25 the
project answers `google: true`: the app shows the button.** `node supabase/preflight.mjs` prints this.

Steps for the owner (from the current Supabase documentation; the secret stays in the dashboard, never in
this repository, never in a `VITE_` variable, never in Lovable):

1. **Google Cloud Console** → Google Auth platform: configure **Audience**, **Data Access** (scopes
   `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile`) and, for a clean consent screen,
   **Branding**.
2. **Clients** → create an **OAuth client ID** of type **Web application**.
   - **Authorized JavaScript origins**: the published address, the Lovable preview address, and
     `http://localhost:8080` for local work.
   - **Authorized redirect URIs**: `https://liewjcwkogoesgxcuyff.supabase.co/auth/v1/callback` (also shown on
     the Google provider page of the dashboard).
3. Copy the **Client ID** and **Client secret**.
4. Dashboard → **Authentication** → **Sign In / Providers** → **Google** (direct link:
   `https://supabase.com/dashboard/project/liewjcwkogoesgxcuyff/auth/providers?provider=Google`): enable,
   paste both values, save.
5. Check the **Redirect URLs** (section 3) include the sign-in page patterns (`https://<published address>/**`,
   the preview address, `http://localhost:8080/**`).
6. `node supabase/preflight.mjs` must now print "Google sign-in is enabled"; reload the app: the button appears.

Behaviour: the app uses the implicit flow, so Google sends the member back to `/auth/sign-in` with a session
and the usual routing applies (new member → welcome page). Supabase **automatically links identities that
share the same verified e-mail address** to one user, so a member who signed up by e-mail and later uses
Google with that address stays one account. A Google sign-up with an address that exists by e-mail with an
**unverified** address does not link. Signing up by e-mail with an address already created through Google gives
the same neutral screen as for any existing address, and no mail. The profile of a Google member is created
by the same trigger as any other (name taken from the address, never from Google's metadata).
Tried for real by the owner on 2026-10-25 (their own Google account, local app on aimf-dev): sign-in, session
kept after a reload, sign-out, then sign-in again on the same profile (`docs/member-auth/BILAN.md`, section 14).
Not tried: a refusal or cancellation at Google, linking with an e-mail account of the same address, the published
address and the Lovable preview.

Email templates can keep the default `{{ .ConfirmationURL }}` links: the app uses the implicit flow,
so a link also works when opened on another device.

## 4. Check, with a mailbox you own

Sign up with that address, open the confirmation mail, sign in, sign out, ask for a password reset,
open the reset mail, choose a new password, sign in again. Delete the test account afterwards from
**Authentication → Users** (its profile goes with it).

Until this has been done once, everything reported about the member journey comes from simulations
(see `docs/member-auth/BILAN.md`): none of it proves the behaviour of aimf-dev or of the SMTP service.

## 5. Remote state of aimf-dev (as reported by the owner, 2026-10-25)

| Item | State |
|---|---|
| Migration `member_profiles` | **Applied** on aimf-dev (`liewjcwkogoesgxcuyff`). **Do not apply it again.** |
| Remote migration version | `20261024224751` |
| Local file | `supabase/migrations/20261024090000_member_profiles.sql`, unchanged since commit `8ae163a` |
| Verification script | all 35 rows true; no test data left behind; no security warning reported |
| Recorded by | the owner; not checked from this repository (no access to the project's dashboard or database) |

**Link between the two version numbers.** The local file name carries the number it was written with
(`20261024090000`); the remote history records the moment the owner applied it (`20261024224751`,
that is 2026-10-24 22:47:51). They describe **the same migration**, so the numbers differ although the
content is the same. Consequences:

- Nothing to run: the project already has the table, policies and triggers.
- If the Supabase CLI is adopted later, `supabase migration list` will show the local version as local-only
  and the remote one as remote-only. Do **not** run `db push` in that state (it would try to apply the file
  again and fail on "already exists"). Either rename the local file to the remote version in a dedicated
  commit, which also changes the path read by `src/auth/hygiene.test.ts`, or mark them as the same with
  `supabase migration repair`. Neither was done now.
- The repository keeps the file as the source of truth for review; the remote history is the source of
  truth for what is applied.

**Connection check.** `node supabase/preflight.mjs` (read-only, creates nothing) confirms the project, the
public key, the sign-up settings and that visitors cannot read `profiles`. The manual journey is in
`docs/member-auth/PARCOURS-MANUEL.md`.
