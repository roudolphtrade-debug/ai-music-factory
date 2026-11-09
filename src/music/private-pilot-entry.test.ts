import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as entryModule from "./private-pilot-entry";

/**
 * Correction E-1. workerd reads EVERY export of the Worker's main module as an entrypoint: anything that is neither a
 * class nor a handler object stops the runtime at start-up ("Incorrect type for map entry 'PILOT_PATH': the provided
 * value is not of type 'function or ExportedHandler'"). Vitest imports the module as plain JavaScript and never sees
 * that rule, so it is checked here: the entry exports `default` and nothing else.
 */
describe("dedicated Worker entry: only exports workerd accepts", () => {
  it("exports the default handler and nothing else at runtime", () => {
    expect(Object.keys(entryModule)).toEqual(["default"]);
  });

  it("the default export is a handler object with exactly fetch, queue and scheduled", () => {
    const handler = entryModule.default as unknown as Record<string, unknown>;
    expect(Object.keys(handler).sort()).toEqual(["fetch", "queue", "scheduled"]);
    for (const name of ["fetch", "queue", "scheduled"]) expect(typeof handler[name]).toBe("function");
  });

  it("its source declares no named value export (constants stay in their own module)", () => {
    const source = readFileSync("src/music/private-pilot-entry.ts", "utf8");
    const exports = [...source.matchAll(/^\s*export\s+(?!default\b|type\b|interface\b)[^\n]*/gm)].map((m) => m[0].trim());
    expect(exports).toEqual([]);
    expect(source.match(/^\s*export\s+default\b/gm)).toHaveLength(1);
  });
});
