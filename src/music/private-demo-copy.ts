import type { Lang } from "@/i18n/translations";

export interface PrivatePilotCopy {
  eyebrow: string;
  title: string;
  description: string;
  ownerOnly: string;
  prompt: string;
  promptPlaceholder: string;
  genre: string;
  mood: string;
  language: string;
  voice: string;
  lyrics: string;
  optional: string;
  submit: string;
  generating: string;
  quota: string;
  warning: string;
  result: string;
  download: string;
  spokenNotGuaranteed: string;
  failed: string;
  blocked: string;
}

export const PRIVATE_PILOT_COPY: Record<Lang, PrivatePilotCopy> = {
  fr: {
    eyebrow: "PILOTE PRIVÉ · Lyria 3.5",
    title: "Générer une vraie chanson",
    description: "Paroles, musique et voix chantée en une seule génération. Accès réservé au propriétaire.",
    ownerOnly: "Accès propriétaire",
    prompt: "Décris ta chanson",
    promptPlaceholder: "Une chanson Afrobeats lumineuse sur la réussite, avec un refrain mémorable…",
    genre: "Genre",
    mood: "Ambiance",
    language: "Langue du chant",
    voice: "Voix souhaitée",
    lyrics: "Paroles personnalisées",
    optional: "facultatif",
    submit: "Générer une chanson réelle",
    generating: "Génération en cours — ne pas relancer",
    quota: "Générations utilisées",
    warning: "Chaque tentative peut être facturée, même si la réponse échoue. Aucun renouvellement automatique.",
    result: "Chanson générée",
    download: "Télécharger le MP3",
    spokenNotGuaranteed: "Les préférences de voix sont indicatives. Le résultat est conservé uniquement dans cet onglet.",
    failed: "Génération non terminée. Vérifier le journal avant tout nouvel essai.",
    blocked: "Pilote indisponible ou budget épuisé. Aucun nouvel appel lancé.",
  },
  en: {
    eyebrow: "PRIVATE PILOT · Lyria 3.5",
    title: "Generate a real song",
    description: "Lyrics, music and sung vocals in one generation. Owner access only.",
    ownerOnly: "Owner only",
    prompt: "Describe your song",
    promptPlaceholder: "An uplifting Afrobeats song with a memorable chorus…",
    genre: "Genre",
    mood: "Mood",
    language: "Sung language",
    voice: "Vocal preference",
    lyrics: "Your lyrics",
    optional: "optional",
    submit: "Generate a real song",
    generating: "Generating — do not retry",
    quota: "Generations used",
    warning: "Each attempt may be billed, even if the response fails. No automatic retry.",
    result: "Generated song",
    download: "Download MP3",
    spokenNotGuaranteed: "Vocal preferences are best effort. This result stays only in this tab.",
    failed: "Generation did not complete. Check the ledger before another attempt.",
    blocked: "Pilot unavailable or quota exhausted. No new call was sent.",
  },
  es: {
    eyebrow: "PILOTO PRIVADO · Lyria 3.5",
    title: "Generar una canción real",
    description: "Letra, música y voz cantada en una sola generación. Solo para el propietario.",
    ownerOnly: "Solo propietario",
    prompt: "Describe la canción",
    promptPlaceholder: "Una canción Afrobeats alegre con un estribillo memorable…",
    genre: "Género",
    mood: "Ambiente",
    language: "Idioma de la canción",
    voice: "Preferencia vocal",
    lyrics: "Letra personalizada",
    optional: "opcional",
    submit: "Generar canción real",
    generating: "Generando — no repetir",
    quota: "Generaciones utilizadas",
    warning: "Cada intento puede cobrarse aunque falle. Sin reintentos automáticos.",
    result: "Canción generada",
    download: "Descargar MP3",
    spokenNotGuaranteed: "La voz deseada no está garantizada. El resultado permanece solo en esta pestaña.",
    failed: "Generación incompleta. Comprueba el registro antes de repetir.",
    blocked: "Piloto no disponible o cuota agotada. No se envió otra solicitud.",
  },
  zh: {
    eyebrow: "私人测试 · Lyria 3.5",
    title: "生成真正的歌曲",
    description: "一次生成歌词、音乐和演唱人声。仅限所有者使用。",
    ownerOnly: "仅所有者",
    prompt: "描述你的歌曲",
    promptPlaceholder: "一首欢快的 Afrobeats 歌曲，有难忘的副歌……",
    genre: "曲风",
    mood: "情绪",
    language: "演唱语言",
    voice: "期望人声",
    lyrics: "自定义歌词",
    optional: "可选",
    submit: "生成真实歌曲",
    generating: "正在生成——请勿重试",
    quota: "已使用次数",
    warning: "即使请求失败也可能收费。不会自动重试。",
    result: "已生成歌曲",
    download: "下载 MP3",
    spokenNotGuaranteed: "人声偏好不保证满足。结果仅保留在当前标签页。",
    failed: "生成未完成。再次尝试前请检查记录。",
    blocked: "测试不可用或额度用尽。未发送新请求。",
  },
  pt: {
    eyebrow: "PILOTO PRIVADO · Lyria 3.5",
    title: "Gerar uma música real",
    description: "Letra, música e voz cantada numa única geração. Acesso exclusivo do proprietário.",
    ownerOnly: "Só proprietário",
    prompt: "Descreva sua música",
    promptPlaceholder: "Uma faixa Afrobeats animada com refrão marcante…",
    genre: "Gênero",
    mood: "Clima",
    language: "Idioma do canto",
    voice: "Preferência vocal",
    lyrics: "Letra personalizada",
    optional: "opcional",
    submit: "Gerar música real",
    generating: "Gerando — não repetir",
    quota: "Gerações utilizadas",
    warning: "Cada tentativa pode ser cobrada mesmo que falhe. Sem repetição automática.",
    result: "Música gerada",
    download: "Baixar MP3",
    spokenNotGuaranteed: "A preferência vocal não é garantida. O resultado fica apenas nesta aba.",
    failed: "Geração não concluída. Verifique o registro antes de tentar novamente.",
    blocked: "Piloto indisponível ou cota esgotada. Nenhuma nova chamada enviada.",
  },
  ar: {
    eyebrow: "تجربة خاصة · Lyria 3.5",
    title: "أنشئ أغنية حقيقية",
    description: "كلمات وموسيقى وصوت غنائي في عملية واحدة. للمالك فقط.",
    ownerOnly: "للمالك فقط",
    prompt: "صف أغنيتك",
    promptPlaceholder: "أغنية أفروبيتس مبهجة مع لازمة لا تُنسى…",
    genre: "النوع",
    mood: "الأجواء",
    language: "لغة الغناء",
    voice: "الصوت المفضل",
    lyrics: "كلمات مخصصة",
    optional: "اختياري",
    submit: "إنشاء أغنية حقيقية",
    generating: "جارٍ الإنشاء — لا تعِد المحاولة",
    quota: "عمليات الإنشاء المستخدمة",
    warning: "قد تُحتسب رسوم لكل محاولة حتى عند الفشل. لا توجد إعادة تلقائية.",
    result: "الأغنية المُنشأة",
    download: "تنزيل MP3",
    spokenNotGuaranteed: "تفضيلات الصوت غير مضمونة. النتيجة محفوظة في علامة التبويب هذه فقط.",
    failed: "لم يكتمل الإنشاء. تحقق من السجل قبل المحاولة مرة أخرى.",
    blocked: "التجربة غير متاحة أو نفدت الحصة. لم يُرسَل طلب جديد.",
  },
};
