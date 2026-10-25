// Read-only check of the connection to the Supabase project, to run before the manual member journey:
//   node supabase/preflight.mjs
//
// It reads VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY from .env.local (then .env), or from the
// environment. It only sends GET requests, never creates an account, never sends an e-mail, and never
// prints the key. A secret key (sb_secret_..., or a legacy service_role token) is refused before any
// request is made with it.
import { existsSync, readFileSync } from "node:fs";

const EXPECTED_REF = "liewjcwkogoesgxcuyff";

function readEnvFile(path) {
  if (!existsSync(path)) return {};
  const values = {};
  for (const text of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(text);
    if (match && !text.trim().startsWith("#"))
      values[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
  return values;
}

const file = { ...readEnvFile(".env"), ...readEnvFile(".env.local") };
const url = (process.env.VITE_SUPABASE_URL ?? file.VITE_SUPABASE_URL ?? "")
  .trim()
  .replace(/\/+$/, "");
const key = (
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  file.VITE_SUPABASE_PUBLISHABLE_KEY ??
  ""
).trim();

let failed = 0;
const report = (ok, text) => {
  if (!ok) failed += 1;
  console.log(`${ok ? "ok  " : "FAIL"} ${text}`);
};
const note = (text) => console.log(`     ${text}`);
// Information, not a check: it never counts as a problem.
const info = (text) => console.log(`info ${text}`);

async function call(path, withKey) {
  const headers = withKey ? { apikey: key } : {};
  const response = await fetch(url + path, { headers, signal: AbortSignal.timeout(15000) });
  let body = null;
  try {
    body = await response.json();
  } catch {
    // not JSON
  }
  return { status: response.status, ref: response.headers.get("sb-project-ref"), body };
}

function keyKind(value) {
  if (!value) return "missing";
  if (value.startsWith("sb_secret_")) return "secret";
  if (value.startsWith("sb_publishable_")) return "publishable";
  const parts = value.split(".");
  if (parts.length === 3) {
    try {
      const role = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")).role;
      return role === "anon" ? "legacy-anon" : `legacy-${role}`;
    } catch {
      return "unknown";
    }
  }
  return "unknown";
}

async function main() {
  console.log("Connection check (read-only, no account is created)\n");

  if (!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(url)) {
    report(false, "VITE_SUPABASE_URL is missing or is not an https://<ref>.supabase.co address");
    return 1;
  }
  report(
    url === `https://${EXPECTED_REF}.supabase.co`,
    `the address is the expected project (${EXPECTED_REF})`,
  );

  const gateway = await call("/auth/v1/health", false).catch((error) => ({ error }));
  if (gateway.error) {
    report(false, `the project does not answer (${gateway.error.message})`);
    return 1;
  }
  report(gateway.ref === EXPECTED_REF, "the gateway answers and names the expected project");

  const kind = keyKind(key);
  if (kind === "missing") {
    report(false, "VITE_SUPABASE_PUBLISHABLE_KEY is empty in .env.local");
    note(
      'Paste the publishable key (Project Settings > API Keys > "sb_publishable_...") after the = sign,',
    );
    note("save the file, restart the dev server, then run this check again.");
    return 2;
  }
  if (kind === "secret" || (kind.startsWith("legacy-") && kind !== "legacy-anon")) {
    report(
      false,
      "that key is a SECRET key and must never be used here: remove it from .env.local now",
    );
    note("Use the publishable key (sb_publishable_...) or the legacy anon key instead.");
    return 3;
  }
  report(kind === "publishable" || kind === "legacy-anon", `the key is a public key (${kind})`);
  if (kind === "unknown") return 3;

  const settings = await call("/auth/v1/settings", true);
  report(settings.status === 200, `the key is accepted by the project (HTTP ${settings.status})`);
  if (settings.status === 200 && settings.body) {
    const email = settings.body.external?.email;
    report(email === true, `e-mail sign-up is enabled (${email})`);
    report(
      settings.body.disable_signup === false,
      `new sign-ups are allowed (disable_signup = ${settings.body.disable_signup})`,
    );
    report(
      settings.body.mailer_autoconfirm === false,
      `an address must be confirmed by e-mail (mailer_autoconfirm = ${settings.body.mailer_autoconfirm})`,
    );
    info(
      settings.body.external?.google === true
        ? "Google sign-in is enabled in the project: the app shows the Google button"
        : "Google sign-in is not enabled in the project: the app shows no Google button (expected until it is configured)",
    );
    info(
      "the password rules (length, required characters, leaked-password check) are not readable with a public key: see supabase/README.md section 3",
    );
  }

  const profiles = await call("/rest/v1/profiles?select=id&limit=1", true);
  const code = profiles.body?.code;
  if (profiles.status === 401 || profiles.status === 403) {
    report(
      code === "42501",
      `the profiles table exists and a visitor cannot read it (HTTP ${profiles.status}, ${code})`,
    );
  } else if (profiles.status === 404 || code === "PGRST205" || code === "42P01") {
    report(
      false,
      `the profiles table was not found (${code ?? profiles.status}): the migration is not applied`,
    );
  } else if (profiles.status === 200) {
    const rows = Array.isArray(profiles.body) ? profiles.body.length : "?";
    report(
      false,
      `a visitor can read the profiles table (HTTP 200, ${rows} row(s)): check the policies`,
    );
  } else {
    report(
      false,
      `unexpected answer for the profiles table (HTTP ${profiles.status}, ${code ?? "no code"})`,
    );
  }

  console.log(
    failed
      ? `\n${failed} problem(s): fix them before the manual journey.`
      : "\nAll checks passed. The manual journey can start (docs/member-auth/PARCOURS-MANUEL.md).",
  );
  return failed ? 1 : 0;
}

// Exit through exitCode: calling process.exit() while a request is closing crashes Node on Windows.
main().then((code) => {
  process.exitCode = code;
});
