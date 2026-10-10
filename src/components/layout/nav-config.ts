import {
  Home,
  AudioWaveform,
  Sparkles,
  Users,
  Radio,
  Swords,
  Building2,
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

/** Navigation organised around the five product pillars. */
export const navSections: NavSection[] = [
  {
    heading: "nav.sections.discover",
    items: [
      { label: "nav.home", to: "/", icon: Home, exact: true },
      { label: "nav.artists", to: "/artists", icon: Users },
      { label: "nav.radio", to: "/radio", icon: Radio },
    ],
  },
  {
    heading: "nav.sections.create",
    items: [
      { label: "nav.studio", to: "/studio", icon: AudioWaveform },
      { label: "nav.avatarLab", to: "/avatar-lab", icon: Sparkles },
    ],
  },
  {
    heading: "nav.sections.connect",
    items: [
      { label: "nav.community", to: "/community", icon: MessagesSquare },
      { label: "nav.challenges", to: "/battles", icon: Swords },
    ],
  },
  {
    heading: "nav.sections.grow",
    items: [
      { label: "nav.analytics", to: "/analytics", icon: BarChart3 },
      { label: "nav.labels", to: "/labels", icon: Building2 },
    ],
  },
  {
    heading: "nav.sections.you",
    items: [
      { label: "nav.library", to: "/library", icon: Library },
      { label: "nav.settings", to: "/settings", icon: Settings },
      { label: "nav.credits", to: "/credits", icon: Gem },
    ],
  },
];
