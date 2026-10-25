import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// What must never reach the repository or the browser bundle: a secret key, a database password, a
// mail-service credential. Only the project address and the publishable key are browser-safe.
const root = process.cwd();

function files(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

const scanned = [
  ...files(join(root, "src")),
  ...files(join(root, "supabase")),
  ...files(join(root, "docs", "member-auth")),
  join(root, ".env.example"),
  join(root, "package.json"),
].filter(
  (f) => existsSync(f) && /\.(ts|tsx|sql|md|json|example)$/.test(f) && !/\.test\.tsx?$/.test(f),
);

const FORBIDDEN: [string, RegExp][] = [
  ["a Supabase secret key", /sb_secret_[A-Za-z0-9_-]{8,}/],
  [
    "a JSON web token (legacy anon or service key)",
    /\beyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\./,
  ],
  ["a database URL with a password", /postgres(?:ql)?:\/\/[^\s:@]+:[^\s@]+@/],
  ["an SMTP password", /smtp[._-]?pass(?:word)?\s*[:=]\s*\S+/i],
  ["a service-role environment variable", /SUPABASE_(?:SERVICE_ROLE|SECRET)_KEY\s*=\s*\S+/],
];

describe("secrets stay out of the repository", { timeout: 30_000 }, () => {
  it("scans a meaningful set of files", () => {
    expect(scanned.length).toBeGreaterThan(30);
    expect(scanned.some((f) => f.endsWith(".env.example"))).toBe(true);
    expect(scanned.some((f) => f.endsWith("member_profiles.sql"))).toBe(true);
  });

  it.each(FORBIDDEN)("contains no %s", (_label, pattern) => {
    const hits = scanned
      .filter((f) => pattern.test(readFileSync(f, "utf8")))
      .map((f) => f.replace(root, ""));
    expect(hits).toEqual([]);
  });

  it("keeps .env.example to the two browser-safe variables, the key left empty", () => {
    const lines = readFileSync(join(root, ".env.example"), "utf8")
      .split(/\r?\n/)
      .filter((l) => l.trim() && !l.trim().startsWith("#"));
    expect(lines.map((l) => l.split("=")[0])).toEqual([
      "VITE_SUPABASE_URL",
      "VITE_SUPABASE_PUBLISHABLE_KEY",
    ]);
    expect(lines[1]).toBe("VITE_SUPABASE_PUBLISHABLE_KEY=");
    expect(lines[0]).toMatch(/^VITE_SUPABASE_URL=https:\/\/[a-z0-9]+\.supabase\.co$/);
  });

  it("keeps local values in a Git-ignored file (.env.local) and documents exactly two variables", () => {
    const ignore = readFileSync(join(root, ".gitignore"), "utf8");
    expect(ignore).toMatch(/^\*\.local\s*$/m);
    expect(ignore).toMatch(/^\.env\s*$/m);
    expect(ignore).toMatch(/^\.env\.\*\s*$/m);
    // .env.example is the one environment file that is versioned; its exception comes last.
    const lines = ignore.split(/\r?\n/);
    expect(lines.lastIndexOf("!.env.example")).toBeGreaterThan(lines.lastIndexOf(".env.*"));
    const readme = readFileSync(join(root, "supabase", "README.md"), "utf8");
    expect(readme).toContain(".env.local");
    expect(readme).toContain("VITE_SUPABASE_URL");
    expect(readme).toContain("VITE_SUPABASE_PUBLISHABLE_KEY");
  });

  it("keeps real people out of the documentation: only reserved example addresses appear", () => {
    const docs = files(join(root, "docs", "member-auth")).filter((f) => /\.md$/.test(f));
    const addresses = docs.flatMap(
      (f) => readFileSync(f, "utf8").match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) ?? [],
    );
    expect(addresses.filter((a) => !/@example\.(test|invalid|com)$/.test(a))).toEqual([]);
  });

  it("keeps the SQL verification script honest: exact check count, precise SQLSTATE codes, never committed", () => {
    const sql = readFileSync(
      join(root, "supabase", "verify", "member_profiles_rls_test.sql"),
      "utf8",
    );
    const code = sql
      .split(/\r?\n/)
      .filter((line) => !line.trim().startsWith("--"))
      .join(" ");
    // Every check inserts one row; the last insert is the harness assertion about the count itself.
    const inserts = (code.match(/insert into checks/g) ?? []).length;
    const expected = Number(/expected constant int := (\d+);/.exec(code)?.[1]);
    expect(inserts - 1).toBe(expected);
    // A refusal is accepted for one SQLSTATE only, never for "any error".
    expect(code).not.toMatch(/exception when others then denied/);
    const states = [...code.matchAll(/got = '(\w+)'/g)].map((m) => m[1]);
    expect(states.length).toBeGreaterThan(10);
    expect(states.filter((x) => x !== "no error" && !/^[0-9A-Z]{5}$/.test(x))).toEqual([]);
    // Nothing persists.
    expect(code).not.toMatch(/\bcommit\s*;/i);
    expect(code.trimEnd()).toMatch(/rollback;$/);
  });

  it("reads only VITE_ variables in the browser code (nothing server-side leaks into the bundle)", () => {
    const code = files(join(root, "src")).filter(
      (f) => /\.(ts|tsx)$/.test(f) && !/\.test\.tsx?$/.test(f),
    );
    const used = new Set<string>();
    for (const f of code) {
      for (const m of readFileSync(f, "utf8").matchAll(/import\.meta\.env\.([A-Z0-9_]+)/g))
        used.add(m[1]);
    }
    // DEV is a Vite built-in boolean (true only when serving for development), not an environment value.
    used.delete("DEV");
    expect([...used].sort()).toEqual(["VITE_SUPABASE_PUBLISHABLE_KEY", "VITE_SUPABASE_URL"]);
  });

  it("never logs a session, a token or a password", () => {
    const code = files(join(root, "src", "auth"))
      .concat(files(join(root, "src", "components", "auth")))
      .filter((f) => /\.tsx?$/.test(f) && !/\.test\./.test(f));
    const logging = code.filter((f) =>
      /console\.(log|info|debug|warn|error)\(/.test(readFileSync(f, "utf8")),
    );
    expect(logging.map((f) => f.replace(root, ""))).toEqual([]);
  });

  it("treats artist and label as a declared status: nothing in the code or the database turns it into a privilege", () => {
    const usesRoles = files(join(root, "src"))
      .filter((f) => /\.(ts|tsx)$/.test(f) && !/\.test\.tsx?$/.test(f))
      .map((f) => f.replace(root, "").replace(/\\/g, "/"))
      .filter((f) => !f.startsWith("/src/test/"))
      .filter((f) => /creator_roles/.test(readFileSync(join(root, f), "utf8")));
    // Only the profile model and its form may touch the field: no route, guard or menu.
    expect(usesRoles.sort()).toEqual([
      "/src/auth/types.ts",
      "/src/components/auth/ProfileForm.tsx",
    ]);
    const sql = readFileSync(
      join(root, "supabase", "migrations", "20261024090000_member_profiles.sql"),
      "utf8",
    )
      .split(/\r?\n/)
      .filter((line) => !line.trim().startsWith("--")) // the code, not its comments
      .join(" ");
    expect(sql).not.toMatch(
      /is_admin|is_staff|permissions?\s|app_metadata|auth\.role\(\)|service_role/i,
    );
    expect(sql).not.toMatch(/using\s*\([^)]*creator_roles/i); // no policy decides access from the status
    expect(sql).toMatch(/creator_roles text\[\] not null default '\{\}'/); // empty = listener, no role required
  });
});
