import { LANGS, translate, type Lang } from "@/i18n/translations";

/** What the studio form offers. One list each, shared by the form and by the figures shown beside it. */
export const STUDIO_GENRES = [
  "Hip-Hop",
  "Trap",
  "Afrobeats",
  "UK Drill",
  "Amapiano",
  "Reggaeton",
  "Hyperpop",
  "Neo-Soul",
];
export const STUDIO_VOICES = ["Instrumental", "Warm tenor", "Soprano", "Alto", "Custom voice"];

const EXAMPLE_PROMPT_KEY = "studio.examplePrompt";

/** The example prompt in one language. */
export function examplePromptFor(lang: Lang): string {
  return translate(lang, EXAMPLE_PROMPT_KEY);
}

/**
 * True when the text is the example prompt in any of the six languages, untouched. Such a text is not the
 * member's own words: it follows the language of the interface instead of staying in the one it was
 * first shown in.
 */
export function isExamplePrompt(text: string): boolean {
  return LANGS.some((l) => examplePromptFor(l.code) === text);
}
