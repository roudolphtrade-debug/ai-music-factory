import {
  Home,
  AudioWaveform,
  Sparkles,
  Users,
  Radio,
  Swords,
  Building2,
  Crown,
  MessagesSquare,
  BarChart3,
  Settings,
  Library,
  Gem,
  type LucideIcon,
} from "lucide-react";


export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  exact?: boolean;
}

export interface NavSection {
  heading: string;
  items: NavItem[];
}

export const navSections: NavSection[] = [
  {
    heading: "nav.sections.studio",
    items: [
      { label: "nav.home", to: "/", icon: Home, exact: true },
      { label: "nav.studio", to: "/studio", icon: AudioWaveform },
      { label: "nav.avatarLab", to: "/avatar-lab", icon: Sparkles },
    ],
  },
  {
    heading: "nav.sections.discover",
    items: [
      { label: "nav.artists", to: "/artists", icon: Users },
      { label: "nav.radio", to: "/radio", icon: Radio },
      { label: "nav.battles", to: "/battles", icon: Swords },
      { label: "nav.labels", to: "/labels", icon: Building2 },
      { label: "nav.hallOfFame", to: "/hall-of-fame", icon: Crown },
    ],
  },
  {
    heading: "nav.sections.you",
    items: [
      { label: "nav.library", to: "/library", icon: Library },
      { label: "nav.credits", to: "/credits", icon: Gem },
      { label: "nav.community", to: "/community", icon: MessagesSquare },
      { label: "nav.analytics", to: "/analytics", icon: BarChart3 },
      { label: "nav.settings", to: "/settings", icon: Settings },
    ],
  },
];
