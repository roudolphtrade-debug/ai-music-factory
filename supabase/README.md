# Member accounts: backend set-up

The app talks to one Supabase project, **aimf-dev** (reference `liewjcwkogoesgxcuyff`). No Lovable
Cloud, no server secret: the browser only holds the project URL and the **publishable** key, and
what belongs to a member is protected in the database by row-level security.

Nothing in this folder has been applied to the project. Each step below is done once, by the owner.

## 1. Environment variables (browser-safe values only)

Exactly two variables exist. Both are public by nature (they end up in the JavaScript sent to every
visitor), which is why only these two are allowed:

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://liewjcwkogoesgxcuyff.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | the *publishable* key, `sb_publishable_…`, from **Project Settings → API Keys** |

They are read **when the app is built or started**, not at runtime: changing one means restarting the
dev server or rebuilding.

**Local work.** Copy `.env.example` to **`.env.local`** and fill the key. `.env.local` and `.env` are
both ignored by Git (`*.local`, `.env`, `.env.*`); `.env.example` is the only environment file that is
versioned.
Then run `npm run dev` (port 8080).

**Lovable preview and published site.** The same two variables must be defined in the Lovable project
for its builds (preview and publish), with exactly these names. This has not been verified from this
repository: check in the preview that the sign-in button appears, then run the test of section 4.
Also add the preview address to the Redirect URLs of section 3, or confirmation links will be refused.

**Never** put in the repository or in a `VITE_` variable: a secret key (`sb_secret_…`), the legacy
`service_role` key, the database password or any SMTP credential. An automated test
(`src/auth/hygiene.test.ts`) fails if one appears in the source, the SQL, `.env.example` or the docs.

**Without the two variables** the app still works: the account pages explain that accounts are not
available yet, no request leaves the browser, and public listening and discovery are untouched.

## 2. Database

Run `migrations/20261024090000_member_profiles.sql` once in the SQL editor of the project.
It creates `public.profiles`, its policies, and the trigger that gives every new account a profile.
Then run `verify/member_profiles_rls_test.sql` in the same editor: it works inside a transaction that
is rolled back, and every row of its result must read `ok = true` (25 rows).

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
| Redirect URLs | the published address, any custom domain, the Lovable preview address, and `http://localhost:8080/**` for local work. The app sends members to `/auth/confirm` and `/auth/reset-password` |
| Confirm email | **on** (members must confirm their address before signing in) |
| Minimum password length | **12** (the value kept by the owner; the app enforces the same rule, and also refuses more than 72 bytes, the limit of the service) |
| Leaked-password protection | on if the plan offers it |
| Email OTP expiry | the default (3600 s) or shorter; an expired link shows a clear message and a resend form |
| Custom SMTP | the owner's provider, configured in **Authentication → SMTP Settings** only. The credentials stay in the dashboard |

The remote setting is not changed from this repository. If it stays below 12, the app still refuses
shorter passwords; if it is above 12, the app shows its generic "too weak" message for the rejected ones.

Email templates can keep the default `{{ .ConfirmationURL }}` links: the app uses the implicit flow,
so a link also works when opened on another device.

## 4. Check, with a mailbox you own

Sign up with that address, open the confirmation mail, sign in, sign out, ask for a password reset,
open the reset mail, choose a new password, sign in again. Delete the test account afterwards from
**Authentication → Users** (its profile goes with it).

Until this has been done once, everything reported about the member journey comes from simulations
(see `docs/member-auth/BILAN.md`): none of it proves the behaviour of aimf-dev or of the SMTP service.
