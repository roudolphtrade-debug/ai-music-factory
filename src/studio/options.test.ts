import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { RETIRED_VOICES, STUDIO_DEFAULT_VOICE, STUDIO_VOICES, voiceLabelKey } from "./options";

describe("lot P0: the voices the studio offers", () => {
  it("are the three synthetic voices, with the default among them", () => {
    expect(STUDIO_VOICES).toEqual(["Warm tenor", "Soprano", "Alto"]);
    expect(STUDIO_VOICES).toContain(STUDIO_DEFAULT_VOICE);
  });

  it("never include a retired choice", () => {
    for (const retired of RETIRED_VOICES) expect(STUDIO_VOICES).not.toContain(retired);
  });

  it("have a label key; a retired or unknown choice has none", () => {
    expect(voiceLabelKey("Alto")).toBe("studio.voices.Alto");
    expect(voiceLabelKey("Instrumental")).toBeNull();
    expect(voiceLabelKey("Custom voice")).toBeNull();
    expect(voiceLabelKey("constructor")).toBeNull();
  });

  it("the server refuses exactly the retired choices and maps exactly the offered ones", () => {
    const route = readFileSync("src/routes/api/studio/generate.ts", "utf8");
    const retired = /const RETIRED_VOICES = new Set\(\[([^\]]*)\]\)/.exec(route)?.[1] ?? "";
    expect(retired.match(/"[^"]+"/g)?.map((v) => v.slice(1, -1))).toEqual(RETIRED_VOICES);
    const map = /const VOICE_MAP[^{]*\{([^}]*)\}/.exec(route)?.[1] ?? "";
    const offered = [...map.matchAll(/^\s*"?([^":]+?)"?\s*:/gm)].map((m) => m[1]);
    expect(offered).toEqual(STUDIO_VOICES);
  });
});
