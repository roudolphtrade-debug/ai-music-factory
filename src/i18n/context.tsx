import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  translate,
  translateArray,
  RTL_LANGS,
  type Lang,
} from "./translations";

const STORAGE_KEY = "afm-lang";
const DEFAULT_LANG: Lang = "fr";

export type RelTime = { n?: number; u: "m" | "h" | "d" | "yesterday" };

interface I18nValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  ta: (key: string) => string[];
  relTime: (time: RelTime) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);

  // Read persisted preference after mount (SSR always renders the default).
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Lang | null;
    if (stored && stored !== lang && ["fr", "en", "es", "zh", "pt", "ar"].includes(stored)) {
      setLangState(stored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
      document.documentElement.dir = RTL_LANGS.includes(lang) ? "rtl" : "ltr";
    }
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<I18nValue>(() => {
    const t = (key: string, vars?: Record<string, string | number>) =>
      translate(lang, key, vars);
    const relTime = (time: RelTime) => {
      if (time.u === "yesterday") return t("time.yesterday");
      return t(`time.${time.u}`, { n: time.n ?? 0 });
    };
    return {
      lang,
      setLang,
      t,
      ta: (key: string) => translateArray(lang, key),
      relTime,
    };
  }, [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within LanguageProvider");
  return ctx;
}
