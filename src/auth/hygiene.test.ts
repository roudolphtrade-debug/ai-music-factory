import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// What must never reach the repository or the browser bundle: a secret key, a database password, a
// mail-service credential. Only the project address and the publishable key are browser-safe, and
// they are the only two values the versioned .env file may hold (the Lovable preview reads it).
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
  join(root, ".env"),
  join(root, ".env.example"),
  join(root, "package.json"),
].filter(
  (f) =>
    existsSync(f) &&
    /(\.(ts|tsx|sql|md|json|example)|[\\/]\.env)$/.test(f) &&
    !/\.test\.tsx?$/.test(f),
);

// Each file is read once, then tested against every pattern: the scan touches a few hundred files.
const contents = new Map<string, string>();
const contentOf = (file: string) => {
  let text = contents.get(file);
  if (text === undefined) {
    text = readFileSync(file, "utf8");
    contents.set(file, text);
  }
  return text;
};

const FORBIDDEN: [string, RegExp][] = [
  ["a Supabase secret key", /sb_secret_[A-Za-z0-9_-]{8,}/],
  [
    "a JSON web token (legacy anon or service key)",
    /\beyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\./,
  ],
  ["a database URL with a password", /postgres(?:ql)?:\/\/[^\s:@]+:[^\s@]+@/],
  ["an SMTP password", /smtp[._-]?pass(?:word)?\s*[:=]\s*\S+/i],
  ["a service-role environment variable", /SUPABASE_(?:SERVICE_ROLE|SECRET)_KEY\s*=\s*\S+/],
  ["a Google OAuth client secret", /GOCSPX-[A-Za-z0-9_-]{10,}/],
  ["a Google OAuth client id", /\b\d{6,}-[a-z0-9]{10,}\.apps\.googleusercontent\.com\b/],
];

describe("secrets stay out of the repository", { timeout: 30_000 }, () => {
  it("scans a meaningful set of files", () => {
    expect(scanned.length).toBeGreaterThan(30);
    expect(scanned.some((f) => f.endsWith(".env.example"))).toBe(true);
    expect(scanned.some((f) => /[\\/]\.env$/.test(f))).toBe(true);
    expect(scanned.some((f) => f.endsWith("member_profiles.sql"))).toBe(true);
  });

  it.each(FORBIDDEN)("contains no %s", (_label, pattern) => {
    const hits = scanned.filter((f) => pattern.test(contentOf(f))).map((f) => f.replace(root, ""));
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

  it("versions .env (public values only) and keeps every other environment file out of Git", () => {
    const ignore = readFileSync(join(root, ".gitignore"), "utf8");
    const lines = ignore.split(/\r?\n/).map((l) => l.trim());
    // Private and per-machine variants stay local: .env.local, .env.production, .env.anything...
    expect(lines).toContain("*.local");
    expect(lines).toContain(".env.*");
    // .env.example is the one variant with an exception, and the exception comes after the rule.
    expect(lines.lastIndexOf("!.env.example")).toBeGreaterThan(lines.lastIndexOf(".env.*"));
    // .env itself is versioned (Lovable needs it committed): no rule may ignore it.
    expect(lines).not.toContain(".env");
    expect(lines).not.toContain("/.env");
    expect(lines).not.toContain("*.env");
    expect(lines).not.toContain(".env*");
    const readme = readFileSync(join(root, "supabase", "README.md"), "utf8");
    expect(readme).toContain(".env.local");
    expect(readme).toContain("VITE_SUPABASE_URL");
    expect(readme).toContain("VITE_SUPABASE_PUBLISHABLE_KEY");
  });

  it("keeps .env to exactly the two browser-safe variables, with a publishable key and no other name", () => {
    const content = readFileSync(join(root, ".env"), "utf8");
    const entries = content
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"));
    // Every line is a plain NAME=value pair: no export, no quotes, no extra variable.
    for (const line of entries) expect(line).toMatch(/^[A-Z][A-Z0-9_]*=\S+$/);
    const names = entries.map((l) => l.slice(0, l.indexOf("=")));
    expect([...names].sort()).toEqual(["VITE_SUPABASE_PUBLISHABLE_KEY", "VITE_SUPABASE_URL"]);
    const value = (name: string) =>
      entries.find((l) => l.startsWith(name + "="))!.slice(name.length + 1);
    // The project address is the one .env.example documents.
    const exampleUrl = /^VITE_SUPABASE_URL=(\S+)$/m.exec(
      readFileSync(join(root, ".env.example"), "utf8"),
    );
    expect(value("VITE_SUPABASE_URL")).toMatch(/^https:\/\/[a-z0-9]+\.supabase\.co$/);
    expect(value("VITE_SUPABASE_URL")).toBe(exampleUrl?.[1]);
    // The key is a publishable one: never a secret key, never a legacy token.
    expect(value("VITE_SUPABASE_PUBLISHABLE_KEY")).toMatch(/^sb_publishable_[A-Za-z0-9_-]{16,}$/);
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
