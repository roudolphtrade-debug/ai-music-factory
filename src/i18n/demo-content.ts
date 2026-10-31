import type { Lang } from "./translations";
import type { ArtistId } from "@/data/mock";

type ArtistCopy = { tagline: string; bio: string; aesthetic: string };
type DemoCopy = {
  artists: Record<ArtistId, ArtistCopy>;
  labels: Record<"l-1" | "l-2" | "l-3" | "l-4", string>;
  labelHouses: string;
};

// Presentation-only catalog: identifiers, playback data and user-authored text stay unchanged.
// These translations should receive a native-speaker review before editorial sign-off.
export const demoContent: Record<Lang, DemoCopy> = {
  en: {
    artists: {
      "art-1": {
        tagline: "Golden-hour electronica from a machine that dreams in amber.",
        bio: "SØL Aurelius is a generative artist forged in the space between dawn and data. Each release is a meditation on warmth, decay, and the quiet luminance of analogue memory rendered through neural synthesis.",
        aesthetic: "Amber minimalism · sculptural lighting",
      },
      "art-2": {
        tagline: "Porcelain vocals wrapped in liquid chrome.",
        bio: "A virtual diva engineered for the avant-garde stage. Seraphine 9 blends hyperpop precision with operatic restraint — a halo of sound built for the era of the post-human pop icon.",
        aesthetic: "Liquid chrome · couture futurism",
      },
      "art-3": {
        tagline: "Faceless techno from the deep machine.",
        bio: "ORACLE never reveals a face — only frequency. A masked electronic entity broadcasting hypnotic, club-ready compositions from an undisclosed server farm somewhere beyond the grid.",
        aesthetic: "Anonymous · monastic black",
      },
      "art-4": {
        tagline: "Trap royalty plated in 24-karat sound.",
        bio: "MIDAS PRIME turns every beat to gold. A larger-than-life virtual rap persona built on heavyweight 808s, opulent ad-libs, and a self-mythology as gilded as his chains.",
        aesthetic: "Maximalist gold · luxury trap",
      },
      "art-5": {
        tagline: "Future-soul woven in gold thread.",
        bio: "Nyla Solenne is a regal virtual songstress channelling neo-soul through a lens of ancient futurism. Her catalogue is intimate, warm, and impossibly poised.",
        aesthetic: "Golden regalia · warm soul",
      },
      "art-6": {
        tagline: "Synthwave transmissions from a gilded horizon.",
        bio: "VISR is a retro-futurist producer hidden behind a mirrored visor. Neon nostalgia meets pristine modern production in widescreen, cinematic synthwave.",
        aesthetic: "Mirrored visor · neon noir",
      },
    },
    labels: {
      "l-1": "The house of shadow and signal.",
      "l-2": "Couture sound for the post-human pop icon.",
      "l-3": "Everything we touch turns platinum.",
      "l-4": "Warm rooms, golden tones.",
    },
    labelHouses: "Label houses",
  },
  fr: {
    artists: {
      "art-1": {
        tagline: "L’electronica de l’heure dorée, née d’une machine qui rêve en ambre.",
        bio: "SØL Aurelius est un artiste génératif né entre l’aube et les données. Chaque sortie médite sur la chaleur, l’érosion et la douce lumière de la mémoire analogique, recréées par synthèse neuronale.",
        aesthetic: "Minimalisme ambré · éclairage sculptural",
      },
      "art-2": {
        tagline: "Une voix de porcelaine enveloppée de chrome liquide.",
        bio: "Une diva virtuelle conçue pour les scènes d’avant-garde. Seraphine 9 associe la précision de l’hyperpop à la retenue de l’opéra : un halo sonore pour l’ère des icônes pop posthumaines.",
        aesthetic: "Chrome liquide · futurisme couture",
      },
      "art-3": {
        tagline: "Une techno sans visage, venue des profondeurs de la machine.",
        bio: "ORACLE ne révèle jamais de visage, seulement des fréquences. Cette entité électronique masquée diffuse des compositions hypnotiques taillées pour les clubs depuis un centre de serveurs secret, quelque part hors du réseau.",
        aesthetic: "Anonymat · noir monastique",
      },
      "art-4": {
        tagline: "La noblesse de la trap, plaquée de son 24 carats.",
        bio: "MIDAS PRIME transforme chaque beat en or. Ce personnage de rap virtuel démesuré mêle basses 808 massives, interjections opulentes et légende personnelle aussi dorée que ses chaînes.",
        aesthetic: "Or maximaliste · trap de luxe",
      },
      "art-5": {
        tagline: "Une soul du futur tissée de fil d’or.",
        bio: "Nyla Solenne est une chanteuse virtuelle majestueuse qui réinvente la néo-soul à travers un futurisme nourri d’antiquité. Son répertoire est intime, chaleureux et d’une grâce rare.",
        aesthetic: "Parures dorées · soul chaleureuse",
      },
      "art-6": {
        tagline: "Des transmissions synthwave depuis un horizon doré.",
        bio: "VISR est un producteur rétrofuturiste caché derrière une visière miroir. La nostalgie des néons rencontre une production moderne et limpide dans une synthwave cinématographique au format panoramique.",
        aesthetic: "Visière miroir · néons noirs",
      },
    },
    labels: {
      "l-1": "La maison de l’ombre et du signal.",
      "l-2": "Un son haute couture pour l’icône pop posthumaine.",
      "l-3": "Tout ce que nous touchons devient platine.",
      "l-4": "Des lieux chaleureux, des sonorités dorées.",
    },
    labelHouses: "Maisons de labels",
  },
  es: {
    artists: {
      "art-1": {
        tagline: "Electrónica de la hora dorada, creada por una máquina que sueña en ámbar.",
        bio: "SØL Aurelius es un artista generativo nacido entre el amanecer y los datos. Cada lanzamiento medita sobre la calidez, el deterioro y la tenue luz de la memoria analógica, recreados mediante síntesis neuronal.",
        aesthetic: "Minimalismo ámbar · iluminación escultórica",
      },
      "art-2": {
        tagline: "Una voz de porcelana envuelta en cromo líquido.",
        bio: "Una diva virtual diseñada para los escenarios de vanguardia. Seraphine 9 combina la precisión del hyperpop con la contención operística: un halo sonoro para la era del icono pop poshumano.",
        aesthetic: "Cromo líquido · futurismo de alta costura",
      },
      "art-3": {
        tagline: "Techno sin rostro desde las profundidades de la máquina.",
        bio: "ORACLE nunca revela un rostro, solo frecuencias. Una entidad electrónica enmascarada que transmite composiciones hipnóticas para la pista de baile desde un centro de servidores secreto, en algún lugar fuera de la red.",
        aesthetic: "Anonimato · negro monástico",
      },
      "art-4": {
        tagline: "La realeza del trap, bañada en sonido de 24 quilates.",
        bio: "MIDAS PRIME convierte cada beat en oro. Un personaje de rap virtual desmesurado, construido sobre potentes bajos 808, interjecciones opulentas y una mitología propia tan dorada como sus cadenas.",
        aesthetic: "Oro maximalista · trap de lujo",
      },
      "art-5": {
        tagline: "Soul del futuro tejido con hilo de oro.",
        bio: "Nyla Solenne es una majestuosa cantante virtual que canaliza el neo-soul a través de un futurismo inspirado en la antigüedad. Su repertorio es íntimo, cálido y de una elegancia excepcional.",
        aesthetic: "Atavíos dorados · soul cálido",
      },
      "art-6": {
        tagline: "Transmisiones synthwave desde un horizonte dorado.",
        bio: "VISR es un productor retrofuturista oculto tras una visera de espejo. La nostalgia del neón se une a una producción moderna e impecable en un synthwave cinematográfico de formato panorámico.",
        aesthetic: "Visera de espejo · neón oscuro",
      },
    },
    labels: {
      "l-1": "La casa de la sombra y la señal.",
      "l-2": "Sonido de alta costura para el icono pop poshumano.",
      "l-3": "Todo lo que tocamos se convierte en platino.",
      "l-4": "Espacios cálidos, tonos dorados.",
    },
    labelHouses: "Casas discográficas",
  },
  pt: {
    artists: {
      "art-1": {
        tagline: "Eletrônica da hora dourada, criada por uma máquina que sonha em âmbar.",
        bio: "SØL Aurelius é um artista generativo nascido entre o amanhecer e os dados. Cada lançamento é uma meditação sobre o calor, a deterioração e a luz suave da memória analógica, recriados por síntese neural.",
        aesthetic: "Minimalismo âmbar · iluminação escultural",
      },
      "art-2": {
        tagline: "Uma voz de porcelana envolta em cromo líquido.",
        bio: "Uma diva virtual concebida para os palcos de vanguarda. Seraphine 9 combina a precisão do hyperpop com a contenção operística: um halo sonoro para a era do ícone pop pós-humano.",
        aesthetic: "Cromo líquido · futurismo de alta-costura",
      },
      "art-3": {
        tagline: "Techno sem rosto vindo das profundezas da máquina.",
        bio: "ORACLE nunca revela um rosto, apenas frequências. Uma entidade eletrônica mascarada que transmite composições hipnóticas para as pistas de dança a partir de um centro de servidores secreto, em algum lugar fora da rede.",
        aesthetic: "Anonimato · preto monástico",
      },
      "art-4": {
        tagline: "A realeza do trap, banhada em som de 24 quilates.",
        bio: "MIDAS PRIME transforma cada beat em ouro. Uma personalidade de rap virtual grandiosa, construída sobre graves 808 pesados, intervenções vocais opulentas e uma mitologia própria tão dourada quanto suas correntes.",
        aesthetic: "Ouro maximalista · trap de luxo",
      },
      "art-5": {
        tagline: "Soul do futuro tecido com fio de ouro.",
        bio: "Nyla Solenne é uma majestosa cantora virtual que canaliza o neo-soul por um futurismo inspirado na antiguidade. Seu repertório é íntimo, acolhedor e de uma elegância excepcional.",
        aesthetic: "Adornos dourados · soul acolhedor",
      },
      "art-6": {
        tagline: "Transmissões de synthwave vindas de um horizonte dourado.",
        bio: "VISR é um produtor retrofuturista escondido atrás de uma viseira espelhada. A nostalgia do neon encontra uma produção moderna e impecável em um synthwave cinematográfico de formato panorâmico.",
        aesthetic: "Viseira espelhada · neon sombrio",
      },
    },
    labels: {
      "l-1": "A casa da sombra e do sinal.",
      "l-2": "Som de alta-costura para o ícone pop pós-humano.",
      "l-3": "Tudo o que tocamos vira platina.",
      "l-4": "Ambientes acolhedores, tons dourados.",
    },
    labelHouses: "Casas de selos",
  },
  zh: {
    artists: {
      "art-1": {
        tagline: "来自一台梦见琥珀的机器，奏响黄金时刻的电子乐。",
        bio: "SØL Aurelius 是诞生于黎明与数据之间的生成式艺人。每次发行都借助神经合成，沉思温暖、消逝与模拟记忆中静谧的微光。",
        aesthetic: "琥珀色极简主义 · 雕塑感灯光",
      },
      "art-2": {
        tagline: "如瓷般细腻的歌声，包裹在液态铬光之中。",
        bio: "为先锋舞台而打造的虚拟歌姬。Seraphine 9 将超流行音乐的精准与歌剧的克制融为一体，为后人类流行偶像时代构筑声音光环。",
        aesthetic: "液态铬光 · 高定未来主义",
      },
      "art-3": {
        tagline: "来自机器深处、不露面孔的科技舞曲。",
        bio: "ORACLE 从不展露面孔，只传递频率。这个蒙面的电子实体从某个网络之外的秘密服务器中心，播送催眠般、适合舞池的作品。",
        aesthetic: "匿名身份 · 修道院式纯黑",
      },
      "art-4": {
        tagline: "陷阱音乐的王者，镀上 24K 金般的声响。",
        bio: "MIDAS PRIME 将每一拍节奏化为黄金。这个气场非凡的虚拟说唱角色，以厚重的 808 低音、华丽的即兴衬词，以及如项链般耀眼的个人神话塑造自身。",
        aesthetic: "极繁金色 · 奢华陷阱音乐",
      },
      "art-5": {
        tagline: "以金线编织的未来灵魂乐。",
        bio: "Nyla Solenne 是一位气质高贵的虚拟女歌手，以融合古典意象的未来主义演绎新灵魂乐。她的作品亲密、温暖，优雅得近乎不可思议。",
        aesthetic: "金色华服 · 温暖灵魂乐",
      },
      "art-6": {
        tagline: "从镀金地平线传来的合成器浪潮。",
        bio: "VISR 是一位藏在镜面护目镜后的复古未来主义制作人。霓虹怀旧与纯净的现代制作相遇，化作宽银幕般、富有电影感的合成器浪潮音乐。",
        aesthetic: "镜面护目镜 · 暗色霓虹",
      },
    },
    labels: {
      "l-1": "暗影与信号的殿堂。",
      "l-2": "为后人类流行偶像打造的高定之声。",
      "l-3": "我们触及的一切，皆化为白金。",
      "l-4": "温暖空间，金色音调。",
    },
    labelHouses: "厂牌之家",
  },
  ar: {
    artists: {
      "art-1": {
        tagline: "موسيقى إلكترونية للساعة الذهبية، من آلة تحلم بلون العنبر.",
        bio: "SØL Aurelius فنان توليدي تشكّل في المسافة بين الفجر والبيانات. كل إصدار تأمل في الدفء والتلاشي والوهج الهادئ للذاكرة التناظرية، تعيد صياغته تقنيات التوليف العصبي.",
        aesthetic: "بساطة عنبرية · إضاءة نحتية",
      },
      "art-2": {
        tagline: "غناء برقة الخزف، يغلّفه الكروم السائل.",
        bio: "نجمة غناء افتراضية صُممت للمسرح الطليعي. تمزج Seraphine 9 دقة الهايبر بوب برصانة الأوبرا، لتصنع هالة صوتية لعصر أيقونات البوب ما بعد البشرية.",
        aesthetic: "كروم سائل · مستقبلية الأزياء الراقية",
      },
      "art-3": {
        tagline: "تكنو بلا وجه، من أعماق الآلة.",
        bio: "لا يكشف ORACLE عن وجه، بل عن ترددات فقط. كيان إلكتروني مقنّع يبث مقطوعات آسرة تناسب ساحات الرقص، من مركز خوادم سري في مكان ما خارج الشبكة.",
        aesthetic: "هوية مجهولة · سواد رهباني",
      },
      "art-4": {
        tagline: "ملوكية التراب، مطلية بصوت من ذهب عيار 24.",
        bio: "يحوّل MIDAS PRIME كل إيقاع إلى ذهب. شخصية راب افتراضية فائقة الحضور، تقوم على جهير 808 ثقيل وإضافات صوتية مترفة وأسطورة ذاتية تتلألأ مثل سلاسله.",
        aesthetic: "ذهب فائق الزخرفة · تراب فاخر",
      },
      "art-5": {
        tagline: "سول المستقبل، منسوج بخيوط الذهب.",
        bio: "Nyla Solenne مغنية افتراضية مهيبة تعيد تقديم النيو سول بمنظور مستقبلي يستلهم العصور القديمة. أعمالها حميمة ودافئة، وتتسم بأناقة استثنائية.",
        aesthetic: "حلي ذهبية · سول دافئ",
      },
      "art-6": {
        tagline: "إشارات سينث ويف من أفق مذهّب.",
        bio: "VISR منتج بمخيلة مستقبلية تستلهم الماضي، يختبئ خلف قناع ذي واجهة عاكسة. يلتقي حنين النيون بإنتاج حديث نقي، في موسيقى سينث ويف بطابع سينمائي واسع الأفق.",
        aesthetic: "قناع عاكس · نيون داكن",
      },
    },
    labels: {
      "l-1": "دار الظلال والإشارات.",
      "l-2": "صوت بتصميم راقٍ لأيقونة البوب ما بعد البشرية.",
      "l-3": "كل ما نلمسه يتحول إلى بلاتين.",
      "l-4": "أماكن دافئة، ونغمات ذهبية.",
    },
    labelHouses: "دور العلامات الموسيقية",
  },
};

export function demoArtistCopy(lang: Lang, id: ArtistId): ArtistCopy {
  return demoContent[lang].artists[id];
}

export function demoLabelTagline(lang: Lang, id: string): string {
  const copy = demoContent[lang].labels;
  return Object.prototype.hasOwnProperty.call(copy, id) ? copy[id as keyof typeof copy] : "";
}
