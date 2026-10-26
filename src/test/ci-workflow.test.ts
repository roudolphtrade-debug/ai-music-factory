import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// The continuous integration stays what it was meant to be: a read-only check of the four things that
// matter (types, lint, tests, build). It must never deploy, publish, read a secret or widen its rights.
const workflow = readFileSync(join(process.cwd(), ".github", "workflows", "ci.yml"), "utf8");
const code = workflow
  .split(/\r?\n/)
  .filter((line) => !line.trim().startsWith("#"))
  .join("\n");

describe("the GitHub CI workflow", () => {
  it("runs on pull requests and on main only", () => {
    expect(code).toMatch(/^on:\s*\n\s+pull_request:/m);
    expect(code).toMatch(/push:\s*\n\s+branches: \[main\]/);
    expect(code).not.toMatch(/workflow_dispatch|schedule:|release:|pull_request_target/);
  });

  it("can only read the repository: no write permission, no secret, no token", () => {
    expect(code).toMatch(/^permissions:\s*\n\s+contents: read\s*$/m);
    expect(code).not.toMatch(/write|secrets\.|GITHUB_TOKEN|id-token/i);
  });

  it("covers TypeScript, ESLint, the tests and the build, in that order", () => {
    const steps = [
      /node node_modules\/typescript\/bin\/tsc --noEmit/,
      /node node_modules\/eslint\/bin\/eslint\.js \./,
      /node node_modules\/vitest\/vitest\.mjs run/,
      /node node_modules\/vite\/bin\/vite\.js build/,
    ];
    const positions = steps.map((re) => code.search(re));
    expect(positions.every((p) => p > -1)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it("refuses new ESLint warnings, and never lets an error through", () => {
    expect(code).toMatch(/--max-warnings=\d+/);
    expect(code).not.toMatch(/continue-on-error|\|\| true|--quiet/);
  });

  it("installs from the lockfile the project uses", () => {
    expect(code).toMatch(/bun install --frozen-lockfile/);
  });

  it("deploys nothing and publishes nothing", () => {
    expect(code).not.toMatch(
      /deploy|publish|wrangler|lovable|supabase (db|functions|link)|npm publish/i,
    );
  });

  it("pins every action to a version", () => {
    const uses = [...code.matchAll(/uses:\s*(\S+)/g)].map((m) => m[1]);
    expect(uses.length).toBeGreaterThan(0);
    for (const action of uses) expect(action, action).toMatch(/@v\d+/);
  });
});
