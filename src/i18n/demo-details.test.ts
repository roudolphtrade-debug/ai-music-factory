import { describe, expect, it } from "vitest";
import { artists } from "@/data/mock";
import { LANGS } from "./translations";
import {
  badgeNames,
  badgeText,
  channelNames,
  channelText,
  demoDetails,
  demoPageHead,
  labelCoverText,
} from "./demo-details";

describe("localized demonstration details", () => {
  it("covers exactly the badges used by demonstration artists", () => {
    expect([...badgeNames].sort()).toEqual([...new Set(artists.flatMap((a) => a.badges))].sort());
  });
  for (const { code } of LANGS) {
    it(`${code}: includes every badge, channel, image description and page`, () => {
      const copy = demoDetails[code];
      expect(Object.keys(copy.badges).sort()).toEqual([...badgeNames].sort());
      expect(Object.keys(copy.channels).sort()).toEqual([...channelNames].sort());
      const texts = [
        ...Object.values(copy.badges),
        ...Object.values(copy.channels),
        copy.labelCover,
        copy.avatarPreview,
        ...Object.values(copy.pages).flatMap((p) => [p.title, p.description]),
      ];
      expect(texts).toHaveLength(27);
      for (const text of texts) {
        expect(text.trim()).toBe(text);
        expect(text.length).toBeGreaterThan(0);
        expect(text).not.toMatch(/�|—/u);
        if (code === "zh") expect(text).toMatch(/\p{Script=Han}/u);
        if (code === "ar") expect(text).toMatch(/\p{Script=Arabic}/u);
      }
      expect(copy.labelCover.match(/\{name\}/g)).toHaveLength(1);
      expect(labelCoverText(code, "$& <Maison>")).toContain("$& <Maison>");
      for (const badge of badgeNames) expect(badgeText(code, badge)).toBe(copy.badges[badge]);
      for (const channel of channelNames)
        expect(channelText(code, channel)).toBe(copy.channels[channel]);
      for (const page of ["artists", "artist", "labels", "label", "community"] as const) {
        const head = demoPageHead(page, code).meta;
        expect(head.find((m) => m.name === "description")?.content).toBe(
          copy.pages[page].description,
        );
        expect(head.find((m) => m.property === "og:description")?.content).toBe(
          copy.pages[page].description,
        );
        expect(head.find((m) => m.name === "twitter:description")?.content).toBe(
          copy.pages[page].description,
        );
        expect(head[0].title).toBe(`${copy.pages[page].title} · AI Music Factory`);
      }
    });
  }
  it("preserves unknown names, including prototype property names", () => {
    for (const { code } of LANGS)
      for (const name of ["Personal badge", "my-channel", "constructor", "__proto__"]) {
        expect(badgeText(code, name)).toBe(name);
        expect(channelText(code, name)).toBe(name);
      }
  });
  it("provides French metadata to server-rendered previews by default", () => {
    expect(demoPageHead("artist")).toEqual(demoPageHead("artist", "fr"));
  });
});
