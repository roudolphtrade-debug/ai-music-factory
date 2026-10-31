import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// A grid column that can not shrink widens the whole page on a phone as soon as one text is longer (it was
// the French one, 13 px too wide at 375 px). The two columns of the artist page must be allowed to shrink.
describe("the two columns of the artist page can shrink on a phone", () => {
  const source = readFileSync("src/routes/_app.artists.$artistId.tsx", "utf8").replace(/\r\n/g, "\n");

  it("the releases column and the side column carry min-w-0", () => {
    expect(source).toContain('<div className="min-w-0 space-y-4 lg:col-span-2">');
    expect(source).toContain('<div className="min-w-0 space-y-6">');
  });

  it("they are the two direct children of the page grid", () => {
    const grid = source.indexOf('<div className="grid gap-6 lg:grid-cols-3">');
    expect(grid).toBeGreaterThan(-1);
    expect(source.indexOf('min-w-0 space-y-4 lg:col-span-2', grid)).toBeGreaterThan(grid);
    expect(source.indexOf('min-w-0 space-y-6', grid)).toBeGreaterThan(grid);
  });
});
