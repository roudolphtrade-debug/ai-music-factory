import { createContext, useContext } from "react";
import type { RelTime } from "./context";
import type { Lang } from "./translations";

export interface I18nValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  ta: (key: string) => string[];
  /** A counted text ("1 titre", "2 titres"): the form that fits the number, in the language of the interface. */
  tn: (key: string, n: number) => string;
  relTime: (time: RelTime) => string;
}

export const I18nContext = createContext<I18nValue | null>(null);

/** The language of the interface when there is one, nothing otherwise (a shared component rendered alone). */
export function useOptionalI18n() {
  return useContext(I18nContext);
}
