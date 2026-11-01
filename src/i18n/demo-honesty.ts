import { useI18n } from "./context";
import type { Lang } from "./translations";

/**
 * Browser-safe catalog for the honesty notices (Lot A.4.0): what is a demo, and why a control is
 * switched off. Kept apart from the main dictionary so these notices evolve without touching it.
 */
const fr = {
  demoStats: "Démo : ces chiffres sont des exemples fictifs, rien n'est mesuré.",
  demoContent: "Démo : ces profils, scores et activités sont des exemples fictifs.",
  demoProfile: "Démo : les champs ci-dessous sont des exemples fictifs. Ils ne viennent pas de votre compte et ne sont pas enregistrés.",
  soon: "Bientôt disponible",
  aiPaused: "Génération IA temporairement indisponible",
  notSaved: "Les modifications ne sont pas encore enregistrées dans cette version.",
  noPosting: "La publication de messages n'est pas encore disponible.",
  noBattle: "L'inscription aux battles n'est pas encore disponible.",
  noCircles: "Les cercles de fans ne sont pas encore disponibles.",
  noReactions: "Les réactions ne sont pas encore disponibles.",
  chartLabel: "Écoutes par jour sur 7 jours (exemple de démonstration)",
  barValue: "{d} : {v} écoutes (exemple)",
  exampleField: "Valeur d'exemple fictive",
  creditsLocal: "Compteur local de démonstration, enregistré sur cet appareil.",
};
const en: typeof fr = {
  demoStats: "Demo: these figures are fictional examples, nothing is measured.",
  demoContent: "Demo: these profiles, scores and activity are fictional examples.",
  demoProfile: "Demo: the fields below are fictional examples. They do not come from your account and are not saved.",
  soon: "Coming soon",
  aiPaused: "AI generation temporarily unavailable",
  notSaved: "Changes are not saved yet in this version.",
  noPosting: "Posting messages is not available yet.",
  noBattle: "Joining battles is not available yet.",
  noCircles: "Fan circles are not available yet.",
  noReactions: "Reactions are not available yet.",
  chartLabel: "Plays per day over 7 days (demo example)",
  barValue: "{d}: {v} plays (example)",
  exampleField: "Fictional example value",
  creditsLocal: "Local demo counter, saved on this device.",
};
const es: typeof fr = {
  demoStats: "Demo: estas cifras son ejemplos ficticios, no se mide nada.",
  demoContent: "Demo: estos perfiles, puntuaciones y actividad son ejemplos ficticios.",
  demoProfile: "Demo: los campos de abajo son ejemplos ficticios. No proceden de tu cuenta y no se guardan.",
  soon: "Próximamente",
  aiPaused: "Generación con IA no disponible temporalmente",
  notSaved: "Los cambios aún no se guardan en esta versión.",
  noPosting: "Publicar mensajes aún no está disponible.",
  noBattle: "Participar en batallas aún no está disponible.",
  noCircles: "Los círculos de fans aún no están disponibles.",
  noReactions: "Las reacciones aún no están disponibles.",
  chartLabel: "Reproducciones por día durante 7 días (ejemplo de demostración)",
  barValue: "{d}: {v} reproducciones (ejemplo)",
  exampleField: "Valor de ejemplo ficticio",
  creditsLocal: "Contador local de demostración, guardado en este dispositivo.",
};
const zh: typeof fr = {
  demoStats: "演示：这些数字是虚构的示例，并非实际测量。",
  demoContent: "演示：这些资料、分数和动态都是虚构的示例。",
  demoProfile: "演示：以下字段是虚构的示例，并非来自你的账户，也不会被保存。",
  soon: "即将推出",
  aiPaused: "AI 生成功能暂时不可用",
  notSaved: "此版本尚不保存修改。",
  noPosting: "暂不支持发布消息。",
  noBattle: "暂不支持报名对战。",
  noCircles: "粉丝圈暂不可用。",
  noReactions: "暂不支持互动反应。",
  chartLabel: "7 天内每日播放量（演示示例）",
  barValue: "{d}：{v} 次播放（示例）",
  exampleField: "虚构的示例值",
  creditsLocal: "本地演示计数器，保存在本设备上。",
};
const pt: typeof fr = {
  demoStats: "Demo: estes números são exemplos fictícios, nada é medido.",
  demoContent: "Demo: estes perfis, pontuações e atividades são exemplos fictícios.",
  demoProfile: "Demo: os campos abaixo são exemplos fictícios. Não vêm da sua conta e não são salvos.",
  soon: "Em breve",
  aiPaused: "Geração por IA temporariamente indisponível",
  notSaved: "As alterações ainda não são salvas nesta versão.",
  noPosting: "A publicação de mensagens ainda não está disponível.",
  noBattle: "A inscrição em batalhas ainda não está disponível.",
  noCircles: "Os círculos de fãs ainda não estão disponíveis.",
  noReactions: "As reações ainda não estão disponíveis.",
  chartLabel: "Reproduções por dia ao longo de 7 dias (exemplo de demonstração)",
  barValue: "{d}: {v} reproduções (exemplo)",
  exampleField: "Valor de exemplo fictício",
  creditsLocal: "Contador local de demonstração, guardado neste dispositivo.",
};
const ar: typeof fr = {
  demoStats: "عرض تجريبي: هذه الأرقام أمثلة وهمية ولا يُقاس شيء فعليًا.",
  demoContent: "عرض تجريبي: هذه الملفات والنقاط والأنشطة أمثلة وهمية.",
  demoProfile: "عرض تجريبي: الحقول أدناه أمثلة وهمية. وهي لا تأتي من حسابك ولا تُحفظ.",
  soon: "قريبًا",
  aiPaused: "التوليد بالذكاء الاصطناعي غير متاح مؤقتًا",
  notSaved: "لا تُحفظ التغييرات بعد في هذا الإصدار.",
  noPosting: "نشر الرسائل غير متاح بعد.",
  noBattle: "التسجيل في المواجهات غير متاح بعد.",
  noCircles: "دوائر المعجبين غير متاحة بعد.",
  noReactions: "التفاعلات غير متاحة بعد.",
  chartLabel: "مرات التشغيل يوميًا خلال 7 أيام (مثال تجريبي)",
  barValue: "{d}: {v} تشغيلًا (مثال)",
  exampleField: "قيمة مثال وهمية",
  creditsLocal: "عدّاد تجريبي محلي محفوظ على هذا الجهاز.",
};

export type DemoHonesty = typeof fr;
export const demoHonesty: Record<Lang, DemoHonesty> = { fr, en, es, zh, pt, ar };

export function useDemoHonesty() {
  const { lang } = useI18n();
  return demoHonesty[lang] ?? fr;
}
