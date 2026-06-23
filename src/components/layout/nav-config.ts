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
    heading: "Studio",
    items: [
      { label: "Home", to: "/", icon: Home, exact: true },
      { label: "Creator Studio", to: "/studio", icon: AudioWaveform },
      { label: "Avatar Lab", to: "/avatar-lab", icon: Sparkles },
    ],
  },
  {
    heading: "Discover",
    items: [
      { label: "Virtual Artists", to: "/artists", icon: Users },
      { label: "AI Radio", to: "/radio", icon: Radio },
      { label: "Battles", to: "/battles", icon: Swords },
      { label: "Virtual Labels", to: "/labels", icon: Building2 },
      { label: "Hall of Fame", to: "/hall-of-fame", icon: Crown },
    ],
  },
  {
    heading: "You",
    items: [
      { label: "Community", to: "/community", icon: MessagesSquare },
      { label: "Analytics", to: "/analytics", icon: BarChart3 },
      { label: "Settings", to: "/settings", icon: Settings },
    ],
  },
];
