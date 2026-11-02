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
/**
 * The synthetic voices the form offers: each one is a real voice of the speech service, which reads the
 * lyrics (nothing sings). The keys stay the old ones so that stored preparations and drafts still read;
 * their labels describe the timbre, not a singing register.
 */
export const STUDIO_VOICES = ["Warm tenor", "Soprano", "Alto"];
export const STUDIO_DEFAULT_VOICE = "Warm tenor";
/**
 * Choices the form no longer offers because they did not do what they said: "Instrumental" still produced
 * a spoken voice, and "Custom voice" was one fixed voice. A stored preparation that holds one of them is
 * put back with the default voice; the server refuses them.
 */
export const RETIRED_VOICES = ["Instrumental", "Custom voice"];

/** The translation key of an offered voice, or `null` for a retired or unknown one. */
export function voiceLabelKey(voice: string): string | null {
  return STUDIO_VOICES.includes(voice) ? `studio.voices.${voice}` : null;
}

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
