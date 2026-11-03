import type { Lang } from "@/i18n/translations";

/**
 * Why an engaged attempt awaits the owner. Each text says what is known and what is not: whether the provider may
 * have billed, whether the song is lost, and that no new call is made by itself. `storage_size_mismatch` reads as
 * `storage_failed`; any other reason falls back to `statusNeedsReview`.
 */
export type PilotReviewReason =
  | "provider_failed"
  | "provider_rate_limited"
  | "provider_invalid_output"
  | "storage_failed"
  | "storage_integrity_failed"
  | "outcome_unknown";
export const PILOT_REVIEW_REASONS: readonly PilotReviewReason[] = [
  "provider_failed",
  "provider_rate_limited",
  "provider_invalid_output",
  "storage_failed",
  "storage_integrity_failed",
  "outcome_unknown",
];
export function reviewReasonKey(reason: string | null): PilotReviewReason | null {
  if (reason === "storage_size_mismatch") return "storage_failed";
  return (PILOT_REVIEW_REASONS as readonly string[]).includes(reason ?? "") ? (reason as PilotReviewReason) : null;
}

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
  statusQueued: string;
  statusRunning: string;
  statusStored: string;
  statusNeedsReview: string;
  statusHalted: string;
  refresh: string;
  reviewRequired: string;
  statusReviewed: string;
  audioUnavailable: string;
  mockProvider: string;
  reviewReasons: Record<PilotReviewReason, string>;
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
    spokenNotGuaranteed: "Les préférences de voix sont indicatives. Le morceau est conservé en privé : il reste disponible après la fermeture de l'onglet.",
    failed: "Génération non terminée. Vérifier le journal avant tout nouvel essai.",
    blocked: "Pilote indisponible ou budget épuisé. Aucun nouvel appel lancé.",
    statusQueued: "En file d'attente : la génération va commencer. Vous pouvez fermer cet onglet.",
    statusRunning: "Génération en cours chez Google (environ 30 secondes). Vous pouvez fermer cet onglet.",
    statusStored: "Morceau prêt et conservé en privé.",
    statusNeedsReview: "Issue incertaine : aucun nouvel appel ne sera lancé. Vérification par le propriétaire nécessaire.",
    statusHalted: "Tentative arrêtée avant tout appel au fournisseur.",
    refresh: "Actualiser l'état",
    reviewRequired: "Une tentative attend une vérification : le pilote est bloqué jusqu'à votre revue.",
    statusReviewed: "Tentative vérifiée par le propriétaire. Elle reste comptée dans le plafond.",
    audioUnavailable: "Le fichier conservé n'a pas passé le contrôle d'intégrité : il n'est pas lu. Aucun nouvel appel n'est lancé.",
    mockProvider: "Recette : fournisseur fictif. Aucun appel à Google, aucun son réel.",
    reviewReasons: {
      provider_failed: "Google n'a pas renvoyé de morceau exploitable. L'appel a pu être facturé. Aucun nouvel essai automatique.",
      provider_rate_limited: "Google a refusé l'appel (limite de débit). La facturation de cet appel n'est pas connue. Aucun nouvel essai automatique.",
      provider_invalid_output: "Google a renvoyé un fichier inutilisable. L'appel a pu être facturé. Aucun nouvel essai automatique.",
      storage_failed: "Le morceau a pu être produit et facturé, mais il n'a pas pu être enregistré : il est perdu. Aucun nouvel appel ne sera lancé.",
      storage_integrity_failed: "Le fichier conservé ne correspond pas à son empreinte : il n'est pas diffusé. L'appel a pu être facturé.",
      outcome_unknown: "Traitement interrompu : l'issue de l'appel est inconnue et il a pu être facturé. Aucun nouvel appel ne sera lancé.",
    },
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
    spokenNotGuaranteed: "Vocal preferences are best effort. The song is kept privately: it is still there after the tab is closed.",
    failed: "Generation did not complete. Check the ledger before another attempt.",
    blocked: "Pilot unavailable or quota exhausted. No new call was sent.",
    statusQueued: "Queued: generation is about to start. You can close this tab.",
    statusRunning: "Generating at Google (about 30 seconds). You can close this tab.",
    statusStored: "Song ready and kept privately.",
    statusNeedsReview: "Uncertain outcome: no new call will be made. Owner review needed.",
    statusHalted: "Attempt stopped before any call to the provider.",
    refresh: "Refresh status",
    reviewRequired: "An attempt awaits review: the pilot is blocked until you check it.",
    statusReviewed: "Attempt reviewed by the owner. It still counts towards the cap.",
    audioUnavailable: "The stored file failed its integrity check: it is not played. No new call is made.",
    mockProvider: "Test run: fictitious provider. No call to Google, no real audio.",
    reviewReasons: {
      provider_failed: "Google returned no usable song. The call may have been billed. No automatic retry.",
      provider_rate_limited: "Google refused the call (rate limit). Whether it was billed is unknown. No automatic retry.",
      provider_invalid_output: "Google returned an unusable file. The call may have been billed. No automatic retry.",
      storage_failed: "The song may have been produced and billed, but it could not be saved: it is lost. No new call will be made.",
      storage_integrity_failed: "The stored file does not match its fingerprint: it is not served. The call may have been billed.",
      outcome_unknown: "Processing was interrupted: the outcome of the call is unknown and it may have been billed. No new call will be made.",
    },
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
    spokenNotGuaranteed: "La voz deseada no está garantizada. La canción se guarda en privado y sigue disponible al cerrar la pestaña.",
    failed: "Generación incompleta. Comprueba el registro antes de repetir.",
    blocked: "Piloto no disponible o cuota agotada. No se envió otra solicitud.",
    statusQueued: "En cola: la generación va a empezar. Puedes cerrar esta pestaña.",
    statusRunning: "Generando en Google (unos 30 segundos). Puedes cerrar esta pestaña.",
    statusStored: "Canción lista y guardada en privado.",
    statusNeedsReview: "Resultado incierto: no se hará ninguna llamada nueva. Revisión del propietario necesaria.",
    statusHalted: "Intento detenido antes de cualquier llamada al proveedor.",
    refresh: "Actualizar estado",
    reviewRequired: "Un intento espera revisión: el piloto queda bloqueado hasta que lo revises.",
    statusReviewed: "Intento revisado por el propietario. Sigue contando dentro del límite.",
    audioUnavailable: "El archivo guardado no superó el control de integridad: no se reproduce. No se hace ninguna llamada nueva.",
    mockProvider: "Prueba: proveedor ficticio. Ninguna llamada a Google, ningún audio real.",
    reviewReasons: {
      provider_failed: "Google no devolvió ninguna canción utilizable. La llamada pudo cobrarse. Sin reintento automático.",
      provider_rate_limited: "Google rechazó la llamada (límite de frecuencia). No se sabe si se cobró. Sin reintento automático.",
      provider_invalid_output: "Google devolvió un archivo inutilizable. La llamada pudo cobrarse. Sin reintento automático.",
      storage_failed: "La canción pudo generarse y cobrarse, pero no se pudo guardar: se ha perdido. No se hará ninguna llamada nueva.",
      storage_integrity_failed: "El archivo guardado no coincide con su huella: no se sirve. La llamada pudo cobrarse.",
      outcome_unknown: "Proceso interrumpido: el resultado de la llamada es desconocido y pudo cobrarse. No se hará ninguna llamada nueva.",
    },
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
    spokenNotGuaranteed: "人声偏好不保证满足。歌曲会被私密保存，关闭标签页后仍可获取。",
    failed: "生成未完成。再次尝试前请检查记录。",
    blocked: "测试不可用或额度用尽。未发送新请求。",
    statusQueued: "排队中：即将开始生成。你可以关闭此标签页。",
    statusRunning: "正在由 Google 生成（约 30 秒）。你可以关闭此标签页。",
    statusStored: "歌曲已就绪并已私密保存。",
    statusNeedsReview: "结果不确定：不会再发起新的调用。需要所有者检查。",
    statusHalted: "该尝试在调用服务商之前已停止。",
    refresh: "刷新状态",
    reviewRequired: "有一次尝试等待检查：在你检查之前，试点处于锁定状态。",
    statusReviewed: "该尝试已由所有者检查，仍计入次数上限。",
    audioUnavailable: "保存的文件未通过完整性校验：不会播放。不会发起新的调用。",
    mockProvider: "测试运行：虚拟服务商。不调用 Google，没有真实音频。",
    reviewReasons: {
      provider_failed: "Google 未返回可用的歌曲。此次调用可能已收费。不会自动重试。",
      provider_rate_limited: "Google 拒绝了此次调用（频率限制）。是否收费未知。不会自动重试。",
      provider_invalid_output: "Google 返回了无法使用的文件。此次调用可能已收费。不会自动重试。",
      storage_failed: "歌曲可能已生成并收费，但未能保存：已经丢失。不会发起新的调用。",
      storage_integrity_failed: "保存的文件与其指纹不符：不会提供。此次调用可能已收费。",
      outcome_unknown: "处理被中断：调用结果未知，可能已收费。不会发起新的调用。",
    },
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
    spokenNotGuaranteed: "A preferência vocal não é garantida. A faixa fica guardada em privado e continua disponível após fechar a aba.",
    failed: "Geração não concluída. Verifique o registro antes de tentar novamente.",
    blocked: "Piloto indisponível ou cota esgotada. Nenhuma nova chamada enviada.",
    statusQueued: "Na fila: a geração vai começar. Você pode fechar esta aba.",
    statusRunning: "Gerando no Google (cerca de 30 segundos). Você pode fechar esta aba.",
    statusStored: "Faixa pronta e guardada em privado.",
    statusNeedsReview: "Resultado incerto: nenhuma nova chamada será feita. Revisão do proprietário necessária.",
    statusHalted: "Tentativa interrompida antes de qualquer chamada ao fornecedor.",
    refresh: "Atualizar estado",
    reviewRequired: "Uma tentativa aguarda revisão: o piloto fica bloqueado até você verificar.",
    statusReviewed: "Tentativa revisada pelo proprietário. Continua contando no limite.",
    audioUnavailable: "O arquivo guardado não passou na verificação de integridade: não é reproduzido. Nenhuma nova chamada é feita.",
    mockProvider: "Teste: fornecedor fictício. Nenhuma chamada ao Google, nenhum áudio real.",
    reviewReasons: {
      provider_failed: "O Google não devolveu nenhuma música utilizável. A chamada pode ter sido cobrada. Sem nova tentativa automática.",
      provider_rate_limited: "O Google recusou a chamada (limite de frequência). Não se sabe se foi cobrada. Sem nova tentativa automática.",
      provider_invalid_output: "O Google devolveu um arquivo inutilizável. A chamada pode ter sido cobrada. Sem nova tentativa automática.",
      storage_failed: "A música pode ter sido gerada e cobrada, mas não pôde ser guardada: está perdida. Nenhuma nova chamada será feita.",
      storage_integrity_failed: "O arquivo guardado não corresponde à sua impressão digital: não é servido. A chamada pode ter sido cobrada.",
      outcome_unknown: "Processamento interrompido: o resultado da chamada é desconhecido e ela pode ter sido cobrada. Nenhuma nova chamada será feita.",
    },
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
    spokenNotGuaranteed: "تفضيلات الصوت غير مضمونة. تُحفظ الأغنية بشكل خاص وتبقى متاحة بعد إغلاق علامة التبويب.",
    failed: "لم يكتمل الإنشاء. تحقق من السجل قبل المحاولة مرة أخرى.",
    blocked: "التجربة غير متاحة أو نفدت الحصة. لم يُرسَل طلب جديد.",
    statusQueued: "في قائمة الانتظار: سيبدأ الإنشاء قريبًا. يمكنك إغلاق علامة التبويب هذه.",
    statusRunning: "جارٍ الإنشاء لدى Google (نحو 30 ثانية). يمكنك إغلاق علامة التبويب هذه.",
    statusStored: "الأغنية جاهزة ومحفوظة بشكل خاص.",
    statusNeedsReview: "النتيجة غير مؤكدة: لن يُرسَل أي طلب جديد. يلزم تحقق المالك.",
    statusHalted: "توقفت المحاولة قبل أي طلب إلى المزوّد.",
    refresh: "تحديث الحالة",
    reviewRequired: "محاولة بانتظار المراجعة: التجربة متوقفة حتى تتحقق منها.",
    statusReviewed: "راجع المالك هذه المحاولة. وهي لا تزال محسوبة ضمن الحد الأقصى.",
    audioUnavailable: "لم يجتز الملف المحفوظ فحص السلامة: لن يُشغَّل. لن يُرسَل أي طلب جديد.",
    mockProvider: "تشغيل تجريبي: مزوّد وهمي. لا طلب إلى Google ولا صوت حقيقي.",
    reviewReasons: {
      provider_failed: "لم تُرجع Google أي أغنية صالحة للاستخدام. ربما احتُسبت رسوم الطلب. لا إعادة تلقائية.",
      provider_rate_limited: "رفضت Google الطلب (حد المعدل). لا يُعرف إن كانت الرسوم قد احتُسبت. لا إعادة تلقائية.",
      provider_invalid_output: "أرجعت Google ملفًا غير صالح للاستخدام. ربما احتُسبت رسوم الطلب. لا إعادة تلقائية.",
      storage_failed: "ربما أُنشئت الأغنية واحتُسبت رسومها، لكن تعذّر حفظها: لقد فُقدت. لن يُرسَل أي طلب جديد.",
      storage_integrity_failed: "الملف المحفوظ لا يطابق بصمته: لن يُقدَّم. ربما احتُسبت رسوم الطلب.",
      outcome_unknown: "توقفت المعالجة: نتيجة الطلب غير معروفة وربما احتُسبت رسومه. لن يُرسَل أي طلب جديد.",
    },
  },
};
