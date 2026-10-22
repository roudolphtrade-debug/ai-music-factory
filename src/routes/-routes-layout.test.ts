import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// TanStack Router treats every file in src/routes as a route unless its name starts with "-"
// (routeFileIgnorePrefix). A test left there makes the dev server and the build print
// "does not export a Route" warnings, which would also bury the warnings that matter.
function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

describe("src/routes", () => {
  const all = files(join(process.cwd(), "src", "routes"));
  const tests = all.filter((f) => /\.test\.(ts|tsx)$/.test(f));

  it("keeps its test files hidden from the route generator with the '-' prefix", () => {
    expect(tests.length).toBeGreaterThan(0);
    const visible = tests.filter((f) => !/[\\/]-[^\\/]+$/.test(f));
    expect(visible).toEqual([]);
  });

  it("still lets Vitest pick those files up", () => {
    // vitest.config.ts includes "src/**/*.test.{ts,tsx}": a leading "-" does not change that.
    for (const f of tests) expect(f).toMatch(/\.test\.(ts|tsx)$/);
  });
});
