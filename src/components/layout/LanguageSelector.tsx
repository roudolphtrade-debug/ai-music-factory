import { useId } from "react";
import { Check, ChevronDown, Globe, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CircularFlag } from "@/components/premium/CircularFlag";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/i18n/context";
import { LANGS, RTL_LANGS, type Lang } from "@/i18n/translations";

// Presentation only: language identifiers, selection and storage stay with I18n.
const names: Record<Lang, string> = {
  fr: "Français", en: "English", es: "Español", zh: "中文",
  pt: "Português (Brasil)", ar: "العربية",
};
const titles: Record<Lang, string> = {
  fr: "Choisir une langue", en: "Choose a language", es: "Elegir un idioma",
  zh: "选择语言", pt: "Escolher um idioma", ar: "اختر لغة",
};

export function LanguageSelector() {
  const { lang, setLang } = useI18n();
  const titleId = useId();
  const dir = RTL_LANGS.includes(lang) ? "rtl" : "ltr";

  return (
    <DropdownMenu dir={dir}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          data-testid="language-selector"
          aria-label={`${titles[lang]} · ${names[lang]}`}
          className="group h-11 shrink-0 gap-1.5 border-border bg-secondary px-2.5 text-foreground hover:border-gold/30 hover:bg-accent focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background data-[state=open]:border-gold/30 motion-reduce:transition-none sm:gap-2 sm:px-3"
        >
          <Globe aria-hidden="true" className="text-gold" />
          <bdi className="min-w-5 text-center text-xs font-semibold">{lang.toUpperCase()}</bdi>
          <ChevronDown aria-hidden="true" className="size-3 text-muted-foreground transition-transform duration-150 group-data-[state=open]:rotate-180 motion-reduce:transform-none motion-reduce:transition-none" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        collisionPadding={12}
        aria-labelledby={titleId}
        className="w-64 max-w-[calc(100vw-1.5rem)] rounded-lg border-border bg-popover p-1.5 text-popover-foreground shadow-lg motion-reduce:data-[state=open]:animate-none motion-reduce:data-[state=closed]:animate-none"
      >
        <DropdownMenuLabel id={titleId} className="border-b border-border px-3 py-3 text-sm font-medium">
          {titles[lang]}
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={lang}
          onValueChange={(value) => {
            const choice = LANGS.find((item) => item.code === value);
            if (choice) setLang(choice.code);
          }}
          className="pt-1.5"
        >
          {LANGS.map((item) => (
            <DropdownMenuRadioItem
              key={item.code}
              value={item.code}
              className="min-h-11 cursor-pointer gap-3 rounded-md py-2 ps-3 pe-9 text-foreground transition-colors focus:bg-accent focus:text-foreground focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-gold data-[state=checked]:bg-gold/15 data-[state=checked]:focus:bg-gold/20 motion-reduce:transition-none [&>span:first-child]:hidden"
            >
              {item.code === "ar" ? (
                <Languages aria-hidden="true" className="size-5 shrink-0 text-gold" />
              ) : (
                <CircularFlag lang={item.code} className="size-5 shrink-0" />
              )}
              <bdi lang={item.code === "pt" ? "pt-BR" : item.code} className="text-sm">{names[item.code]}</bdi>
              {lang === item.code && <Check aria-hidden="true" className="absolute end-3 size-4 text-gold" />}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}