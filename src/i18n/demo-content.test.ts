import { describe, expect, it } from "vitest";
import { artists, labels } from "@/data/mock";
import { LANGS } from "./translations";
import { demoArtistCopy, demoContent, demoLabelTagline } from "./demo-content";

describe("demonstration content in all six languages", () => {
  for (const { code } of LANGS) {
    it(`${code}: covers exactly the existing artists and demonstration labels`, () => {
      const copy = demoContent[code];
      expect(Object.keys(copy.artists).sort()).toEqual(artists.map((a) => a.id).sort());
      expect(Object.keys(copy.labels).sort()).toEqual(labels.map((l) => l.id).sort());
      const texts = [
        ...Object.values(copy.artists).flatMap(Object.values),
        ...Object.values(copy.labels),
        copy.labelHouses,
      ];
      expect(texts).toHaveLength(23);
      for (const text of texts) {
        expect(text.trim()).toBe(text);
        expect(text.length).toBeGreaterThan(0);
        expect(text).not.toMatch(/\{[^}]+\}|�/u);
        if (code === "zh") expect(text).toMatch(/\p{Script=Han}/u);
        if (code === "ar") {
          expect(text).toMatch(/\p{Script=Arabic}/u);
          expect(text).not.toMatch(/[٠-٩]/u);
        }
      }
      if (code !== "en") {
        for (const artist of artists) {
          const translated = demoArtistCopy(code, artist.id);
          for (const key of ["tagline", "bio", "aesthetic"] as const) {
            expect(translated[key]).not.toBe(artist[key]);
            expect(translated[key]).not.toContain("—");
          }
        }
        for (const label of labels)
          expect(demoLabelTagline(code, label.id)).not.toBe(label.tagline);
      }
    });
  }

  it("preserves original English artist texts and label taglines exactly", () => {
    for (const artist of artists) {
      expect(demoArtistCopy("en", artist.id)).toEqual({
        tagline: artist.tagline,
        bio: artist.bio,
        aesthetic: artist.aesthetic,
      });
    }
    for (const label of labels) expect(demoLabelTagline("en", label.id)).toBe(label.tagline);
  });

  it("does not mistake a user label or a prototype property for a demonstration label", () => {
    for (const { code } of LANGS) {
      for (const id of ["ul-my-label", "constructor", "__proto__", "toString"]) {
        expect(demoLabelTagline(code, id)).toBe("");
      }
    }
  });
});
