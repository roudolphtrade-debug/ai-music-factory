import type { ReactNode } from "react";
import type { Lang } from "@/i18n/translations";


const SIZE = 20;

const flags: Record<Lang, ReactNode> = {
  fr: (
    <svg viewBox="0 0 24 24" width={SIZE} height={SIZE} aria-hidden="true">
      <defs>
        <clipPath id="circle-fr">
          <circle cx="12" cy="12" r="12" />
        </clipPath>
      </defs>
      <g clipPath="url(#circle-fr)">
        <rect width="8" height="24" fill="#0055A4" />
        <rect x="8" width="8" height="24" fill="#FFFFFF" />
        <rect x="16" width="8" height="24" fill="#EF4444" />
      </g>
    </svg>
  ),
  en: (
    <svg viewBox="0 0 24 24" width={SIZE} height={SIZE} aria-hidden="true">
      <defs>
        <clipPath id="circle-en">
          <circle cx="12" cy="12" r="12" />
        </clipPath>
      </defs>
      <g clipPath="url(#circle-en)">
        <rect width="24" height="24" fill="#012169" />
        <path d="M0 0L24 24M24 0L0 24" stroke="#FFFFFF" strokeWidth="3" />
        <path d="M12 0V24M0 12H24" stroke="#FFFFFF" strokeWidth="5" />
        <path d="M12 0V24M0 12H24" stroke="#C8102E" strokeWidth="3" />
        <path d="M0 0L24 24M24 0L0 24" stroke="#C8102E" strokeWidth="2" />
      </g>
    </svg>
  ),
  es: (
    <svg viewBox="0 0 24 24" width={SIZE} height={SIZE} aria-hidden="true">
      <defs>
        <clipPath id="circle-es">
          <circle cx="12" cy="12" r="12" />
        </clipPath>
      </defs>
      <g clipPath="url(#circle-es)">
        <rect width="24" height="6" fill="#AA151B" />
        <rect y="6" width="24" height="12" fill="#F1BF00" />
        <rect y="18" width="24" height="6" fill="#AA151B" />
        <g transform="translate(8, 8) scale(0.34)">
          <rect x="0" y="0" width="24" height="16" rx="1" fill="#AA151B" />
          <path d="M6 4h4v4H6zM14 4h4v4h-4zM6 10h12v2H6z" fill="#F1BF00" />
        </g>
      </g>
    </svg>
  ),
  zh: (
    <svg viewBox="0 0 24 24" width={SIZE} height={SIZE} aria-hidden="true">
      <defs>
        <clipPath id="circle-zh">
          <circle cx="12" cy="12" r="12" />
        </clipPath>
      </defs>
      <g clipPath="url(#circle-zh)">
        <rect width="24" height="24" fill="#DE2910" />
        <g fill="#FFDE00">
          <path d="M6 5l1.2 3.6L4.2 7.5h3.6L5.7 10.5z" />
          <path d="M9.5 3.5l0.4 1.3-1.1-0.8h1.3l-1.1 0.8z" />
          <path d="M11.5 5l0.4 1.3-1.1-0.8h1.3l-1.1 0.8z" />
          <path d="M11.5 8l0.4 1.3-1.1-0.8h1.3l-1.1 0.8z" />
          <path d="M9.5 9.5l0.4 1.3-1.1-0.8h1.3l-1.1 0.8z" />
        </g>
      </g>
    </svg>
  ),
  pt: (
    <svg viewBox="0 0 24 24" width={SIZE} height={SIZE} aria-hidden="true">
      <defs>
        <clipPath id="circle-pt">
          <circle cx="12" cy="12" r="12" />
        </clipPath>
      </defs>
      <g clipPath="url(#circle-pt)">
        <rect width="24" height="24" fill="#009739" />
        <path d="M12 2L22 12L12 22L2 12Z" fill="#FEDD00" />
        <circle cx="12" cy="12" r="5" fill="#012169" />
        <path d="M12 7.5a4.5 4.5 0 0 1 0 9 4.5 4.5 0 0 1 0-9" fill="none" stroke="#FFFFFF" strokeWidth="0.6" strokeDasharray="0.6 0.6" />
      </g>
    </svg>
  ),
  ar: (
    <svg viewBox="0 0 24 24" width={SIZE} height={SIZE} aria-hidden="true">
      <defs>
        <clipPath id="circle-ar">
          <circle cx="12" cy="12" r="12" />
        </clipPath>
      </defs>
      <g clipPath="url(#circle-ar)">
        <rect width="24" height="24" fill="#165D31" />
        <path d="M12 6l2.5 5 5.5 0.8-4 3.9 0.9 5.5-4.9-2.6-4.9 2.6 0.9-5.5-4-3.9 5.5-0.8z" fill="#FFFFFF" opacity="0.9" />
        <path d="M16 16c0.6-1.2 1-2.6 1-4 0-2.8-1.3-5.2-3.5-6.5" fill="none" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
      </g>
    </svg>
  ),
};

export function CircularFlag({ lang }: { lang: Lang }) {
  return (
    <span className="inline-flex items-center justify-center rounded-full shadow-sm">
      {flags[lang]}
    </span>
  );
}
