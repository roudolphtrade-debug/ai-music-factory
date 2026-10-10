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
    heading: "nav.sections.create",
    items: [{ label: "nav.studio", to: "/studio", icon: AudioWaveform }],
  },
  {
    heading: "nav.sections.identity",
    items: [
      { label: "nav.avatarLab", to: "/avatar-lab", icon: Sparkles },
      { label: "nav.settings", to: "/settings", icon: Settings },
    ],
  },
  {
    heading: "nav.sections.discover",
    items: [
      { label: "nav.home", to: "/", icon: Home, exact: true },
      { label: "nav.artists", to: "/artists", icon: Users },
      { label: "nav.radio", to: "/radio", icon: Radio },
      { label: "nav.library", to: "/library", icon: Library },
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
];
