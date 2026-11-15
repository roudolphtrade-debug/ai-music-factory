import type { Lang } from "./translations";

type RadioCopy = { decorative: string; needle: string; explore: string; turntable: string };
export const radioVinylCopy: Record<Lang, RadioCopy> = {
  fr: { decorative: "Spectre décoratif · sans analyse audio", needle: "Ambiance : bruit du diamant (facultatif)", explore: "Explorer par", turntable: "Platine vinyle" },
  en: { decorative: "Decorative spectrum · no audio analysis", needle: "Ambience: needle sound (optional)", explore: "Explore by", turntable: "Vinyl turntable" },
  es: { decorative: "Espectro decorativo · sin análisis de audio", needle: "Ambiente: sonido de aguja (opcional)", explore: "Explorar por", turntable: "Tocadiscos de vinilo" },
  pt: { decorative: "Espectro decorativo · sem análise de áudio", needle: "Ambiente: som da agulha (opcional)", explore: "Explorar por", turntable: "Toca-discos de vinil" },
  zh: { decorative: "装饰频谱 · 非音频分析", needle: "氛围：唱针声（可选）", explore: "探索分类", turntable: "黑胶唱机" },
  ar: { decorative: "طيف زخرفي · دون تحليل صوتي", needle: "أجواء: صوت إبرة الأسطوانة (اختياري)", explore: "استكشف حسب", turntable: "مشغل أسطوانات الفينيل" },
};