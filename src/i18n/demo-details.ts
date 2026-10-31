import type { Lang } from "./translations";

export const badgeNames = [
  "Verified",
  "Top 1% Reputation",
  "Radio Favorite",
  "Battle Champion",
  "Discovery Crown",
  "Underground Icon",
  "Top Creator",
  "Platinum Prompt",
  "Rising Star",
  "Fan Favorite",
  "Night Drive Icon",
] as const;
export const channelNames = ["releases", "battles", "golden-hour", "prompt-lab"] as const;
type Badge = (typeof badgeNames)[number];
type Channel = (typeof channelNames)[number];
type Page = "artists" | "artist" | "labels" | "label" | "community";
type Copy = {
  badges: Record<Badge, string>;
  channels: Record<Channel, string>;
  labelCover: string;
  avatarPreview: string;
  pages: Record<Page, { title: string; description: string }>;
};

export const demoDetails: Record<Lang, Copy> = {
  fr: {
    badges: {
      Verified: "Vérifié",
      "Top 1% Reputation": "Réputation : top 1 %",
      "Radio Favorite": "Favori de la radio",
      "Battle Champion": "Champion des battles",
      "Discovery Crown": "Couronne de la découverte",
      "Underground Icon": "Icône underground",
      "Top Creator": "Créateur de premier plan",
      "Platinum Prompt": "Prompt platine",
      "Rising Star": "Étoile montante",
      "Fan Favorite": "Favori du public",
      "Night Drive Icon": "Icône des virées nocturnes",
    },
    channels: {
      releases: "sorties",
      battles: "battles",
      "golden-hour": "heure dorée",
      "prompt-lab": "atelier de prompts",
    },
    labelCover: "Visuel du label {name}",
    avatarPreview: "Aperçu de l’avatar",
    pages: {
      artists: {
        title: "Artistes",
        description:
          "Découvrez et suivez des artistes humains, hybrides et IA dans tous les genres musicaux.",
      },
      artist: {
        title: "Profil d’artiste",
        description:
          "Explorez le profil et le catalogue musical de cet artiste sur AI Music Factory.",
      },
      labels: {
        title: "Labels virtuels",
        description:
          "Découvrez les labels virtuels, leur identité et leurs artistes, puis gérez votre liste de démonstration.",
      },
      label: {
        title: "Profil de label",
        description:
          "Explorez l’identité et la liste d’artistes de démonstration de ce label sur AI Music Factory.",
      },
      community: {
        title: "Communauté",
        description:
          "Retrouvez les cercles de fans, les canaux et les échanges autour des artistes de tous horizons.",
      },
    },
  },
  en: {
    badges: {
      Verified: "Verified",
      "Top 1% Reputation": "Top 1% Reputation",
      "Radio Favorite": "Radio Favorite",
      "Battle Champion": "Battle Champion",
      "Discovery Crown": "Discovery Crown",
      "Underground Icon": "Underground Icon",
      "Top Creator": "Top Creator",
      "Platinum Prompt": "Platinum Prompt",
      "Rising Star": "Rising Star",
      "Fan Favorite": "Fan Favorite",
      "Night Drive Icon": "Night Drive Icon",
    },
    channels: {
      releases: "releases",
      battles: "battles",
      "golden-hour": "golden hour",
      "prompt-lab": "prompt lab",
    },
    labelCover: "Cover art for {name}",
    avatarPreview: "Avatar preview",
    pages: {
      artists: {
        title: "Artists",
        description: "Discover and follow human, hybrid and AI artists across every musical genre.",
      },
      artist: {
        title: "Artist profile",
        description: "Explore this artist’s profile and playable catalogue on AI Music Factory.",
      },
      labels: {
        title: "Virtual labels",
        description:
          "Discover virtual labels, their identities and artists, and manage your demonstration roster.",
      },
      label: {
        title: "Label profile",
        description: "Explore this label’s identity and demonstration roster on AI Music Factory.",
      },
      community: {
        title: "Community",
        description: "Find fan circles, channels and conversation around artists of every kind.",
      },
    },
  },
  es: {
    badges: {
      Verified: "Verificado",
      "Top 1% Reputation": "Reputación: 1 % superior",
      "Radio Favorite": "Favorito de la radio",
      "Battle Champion": "Campeón de batallas",
      "Discovery Crown": "Corona del descubrimiento",
      "Underground Icon": "Icono underground",
      "Top Creator": "Creador destacado",
      "Platinum Prompt": "Prompt de platino",
      "Rising Star": "Estrella emergente",
      "Fan Favorite": "Favorito del público",
      "Night Drive Icon": "Icono de las rutas nocturnas",
    },
    channels: {
      releases: "lanzamientos",
      battles: "batallas",
      "golden-hour": "hora dorada",
      "prompt-lab": "taller de prompts",
    },
    labelCover: "Imagen del sello {name}",
    avatarPreview: "Vista previa del avatar",
    pages: {
      artists: {
        title: "Artistas",
        description:
          "Descubre y sigue a artistas humanos, híbridos y de IA de todos los géneros musicales.",
      },
      artist: {
        title: "Perfil de artista",
        description: "Explora el perfil y el catálogo musical de este artista en AI Music Factory.",
      },
      labels: {
        title: "Sellos virtuales",
        description:
          "Descubre sellos virtuales, sus identidades y artistas, y gestiona tu plantilla de demostración.",
      },
      label: {
        title: "Perfil del sello",
        description:
          "Explora la identidad y la plantilla de artistas de demostración de este sello en AI Music Factory.",
      },
      community: {
        title: "Comunidad",
        description:
          "Encuentra círculos de fans, canales y conversaciones sobre artistas de todos los ámbitos.",
      },
    },
  },
  pt: {
    badges: {
      Verified: "Verificado",
      "Top 1% Reputation": "Reputação: entre os melhores 1%",
      "Radio Favorite": "Favorito da rádio",
      "Battle Champion": "Campeão de batalhas",
      "Discovery Crown": "Coroa da descoberta",
      "Underground Icon": "Ícone underground",
      "Top Creator": "Criador de destaque",
      "Platinum Prompt": "Prompt de platina",
      "Rising Star": "Estrela em ascensão",
      "Fan Favorite": "Favorito do público",
      "Night Drive Icon": "Ícone das viagens noturnas",
    },
    channels: {
      releases: "lançamentos",
      battles: "batalhas",
      "golden-hour": "hora dourada",
      "prompt-lab": "laboratório de prompts",
    },
    labelCover: "Imagem do selo {name}",
    avatarPreview: "Prévia do avatar",
    pages: {
      artists: {
        title: "Artistas",
        description:
          "Descubra e siga artistas humanos, híbridos e de IA de todos os gêneros musicais.",
      },
      artist: {
        title: "Perfil do artista",
        description: "Explore o perfil e o catálogo musical deste artista no AI Music Factory.",
      },
      labels: {
        title: "Selos virtuais",
        description:
          "Descubra selos virtuais, suas identidades e artistas, e gerencie seu elenco de demonstração.",
      },
      label: {
        title: "Perfil do selo",
        description:
          "Explore a identidade e o elenco de artistas de demonstração deste selo no AI Music Factory.",
      },
      community: {
        title: "Comunidade",
        description:
          "Encontre círculos de fãs, canais e conversas sobre artistas de todos os estilos.",
      },
    },
  },
  zh: {
    badges: {
      Verified: "已认证",
      "Top 1% Reputation": "声望前 1%",
      "Radio Favorite": "电台宠儿",
      "Battle Champion": "对决冠军",
      "Discovery Crown": "发现之冠",
      "Underground Icon": "地下音乐代表",
      "Top Creator": "杰出创作者",
      "Platinum Prompt": "白金提示词",
      "Rising Star": "冉冉新星",
      "Fan Favorite": "乐迷最爱",
      "Night Drive Icon": "夜行音乐代表",
    },
    channels: {
      releases: "新作发布",
      battles: "音乐对决",
      "golden-hour": "黄金时刻",
      "prompt-lab": "提示词工坊",
    },
    labelCover: "厂牌 {name} 的封面图",
    avatarPreview: "形象预览",
    pages: {
      artists: {
        title: "艺人",
        description: "发现并关注各类音乐风格的人类、混合创作与人工智能艺人。",
      },
      artist: {
        title: "艺人主页",
        description: "在 AI Music Factory 探索这位艺人的介绍与可播放作品。",
      },
      labels: {
        title: "虚拟厂牌",
        description: "探索虚拟厂牌的身份与艺人，并管理你的演示艺人阵容。",
      },
      label: {
        title: "厂牌主页",
        description: "在 AI Music Factory 探索这个厂牌的身份与演示艺人阵容。",
      },
      community: { title: "社区", description: "寻找乐迷圈、频道，以及围绕各类艺人的交流。" },
    },
  },
  ar: {
    badges: {
      Verified: "موثّق",
      "Top 1% Reputation": "ضمن أعلى 1% في السمعة",
      "Radio Favorite": "مفضّل الراديو",
      "Battle Champion": "بطل المنازلات",
      "Discovery Crown": "تاج الاكتشاف",
      "Underground Icon": "أيقونة الموسيقى البديلة",
      "Top Creator": "مبدع بارز",
      "Platinum Prompt": "وصف بلاتيني",
      "Rising Star": "نجم صاعد",
      "Fan Favorite": "مفضّل الجمهور",
      "Night Drive Icon": "أيقونة الرحلات الليلية",
    },
    channels: {
      releases: "الإصدارات",
      battles: "المنازلات",
      "golden-hour": "الساعة الذهبية",
      "prompt-lab": "مختبر الأوصاف",
    },
    labelCover: "صورة غلاف العلامة {name}",
    avatarPreview: "معاينة الأفاتار",
    pages: {
      artists: {
        title: "الفنانون",
        description:
          "اكتشف وتابع فنانين بشريين وهجينين وفناني ذكاء اصطناعي في مختلف الأنواع الموسيقية.",
      },
      artist: {
        title: "صفحة الفنان",
        description: "استكشف نبذة هذا الفنان وأعماله المتاحة للاستماع على AI Music Factory.",
      },
      labels: {
        title: "علامات افتراضية",
        description: "اكتشف العلامات الافتراضية وهوياتها وفنانيها، وأدر قائمة فنانيك التجريبية.",
      },
      label: {
        title: "صفحة العلامة",
        description: "استكشف هوية هذه العلامة وقائمة فنانيها التجريبية على AI Music Factory.",
      },
      community: {
        title: "المجتمع",
        description: "اعثر على دوائر المعجبين والقنوات والنقاشات حول الفنانين من مختلف الاتجاهات.",
      },
    },
  },
};

export function badgeText(lang: Lang, badge: string): string {
  return badgeNames.includes(badge as Badge) ? demoDetails[lang].badges[badge as Badge] : badge;
}
export function channelText(lang: Lang, channel: string): string {
  return channelNames.includes(channel as Channel)
    ? demoDetails[lang].channels[channel as Channel]
    : channel;
}
export function labelCoverText(lang: Lang, name: string): string {
  return demoDetails[lang].labelCover.replace("{name}", () => name);
}

export function demoPageHead(page: Page, lang: Lang = "fr") {
  const copy = demoDetails[lang].pages[page];
  const title = `${copy.title} · AI Music Factory`;
  return {
    meta: [
      { title },
      { name: "description", content: copy.description },
      { property: "og:title", content: title },
      { property: "og:description", content: copy.description },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: copy.description },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  };
}

export type DemoPage = Page;
