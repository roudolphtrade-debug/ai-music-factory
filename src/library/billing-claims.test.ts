import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// REPRODUCTION AND NON-REGRESSION, point 2 of the audit.
// A generation that comes back after a sign-out is dropped on the screen, on the disk and in the local
// credit wallet. But the AI provider was called before: it has ALREADY BILLED that request. No text of
// the project may say or suggest that an abandoned generation costs nothing.
const root = process.cwd();
const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
const read = (path: string) => readFileSync(path, "utf8");

describe("nothing claims that an abandoned generation is free", () => {
  const sources = files(join(root, "src")).filter(
    (f) => /\.(ts|tsx)$/.test(f) && !/\.test\.tsx?$/.test(f),
  );
  const docs = files(join(root, "docs", "member-auth")).filter((f) => /\.md$/.test(f));
  const FALSE_CLAIMS = [
    /nothing is shown, kept or paid for/i,
    /nothing (is )?(billed|charged)/i,
    /ne débite rien/i,
    /ni débité/i,
    /sans (aucun )?(frais|facturation) pour le fournisseur/i,
  ];

  it("no source comment, text or document uses such a sentence", { timeout: 30_000 }, () => {
    const hits = [...sources, ...docs].flatMap((f) => {
      const text = read(f); // read once, then test every sentence
      return FALSE_CLAIMS.filter((re) => re.test(text)).map(
        (re) => `${f.replace(root, "").replace(/\\/g, "/")} matches ${re}`,
      );
    });
    expect(hits).toEqual([]);
  });

  it("the studio code says the provider has already billed, and only the LOCAL credit is untouched", () => {
    const composer = read(join(root, "src", "components", "premium", "StudioComposer.tsx"));
    expect(composer).toMatch(/already billed/i);
    expect(composer).toMatch(/local credit/i);
  });

  it("the documentation states the real cost: the provider bills at the call, not when the result is kept", () => {
    const lot = read(join(root, "docs", "member-auth", "LOT-STUDIO-GENERER.md"));
    expect(lot).toMatch(/déjà facturé/i);
    expect(lot).toMatch(/crédit local/i);
    // and what the future server-side quotas must therefore count
    expect(lot).toMatch(/compter[^.]*à l'acceptation/i);
  });
});
