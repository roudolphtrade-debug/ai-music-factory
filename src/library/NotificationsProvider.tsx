import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { artists } from "@/data/mock";
import {
  MAX_NOTIFICATIONS,
  NOTIF_KEY,
  makeNotification,
  type AppNotification,
  type NotificationKind,
} from "./notifications";

interface NotificationsValue {
  notifications: AppNotification[];
  unreadCount: number;
  notify: (kind: NotificationKind, titleKey: string, vars?: Record<string, string | number>) => void;
  markAllRead: () => void;
  clear: () => void;
}

const NotificationsContext = createContext<NotificationsValue | null>(null);

function readNotifications(): AppNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(NOTIF_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AppNotification[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    setNotifications(readNotifications());
  }, []);

  const persist = useCallback((next: AppNotification[]) => {
    const trimmed = next.slice(0, MAX_NOTIFICATIONS);
    setNotifications(trimmed);
    try {
      window.localStorage.setItem(NOTIF_KEY, JSON.stringify(trimmed));
    } catch {
      /* ignore */
    }
  }, []);

  const notify = useCallback(
    (kind: NotificationKind, titleKey: string, vars?: Record<string, string | number>) => {
      setNotifications((prev) => {
        const next = [makeNotification(kind, titleKey, vars), ...prev].slice(0, MAX_NOTIFICATIONS);
        try {
          window.localStorage.setItem(NOTIF_KEY, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    },
    [],
  );

  const markAllRead = useCallback(() => {
    setNotifications((prev) => {
      const next = prev.map((n) => (n.read ? n : { ...n, read: true }));
      try {
        window.localStorage.setItem(NOTIF_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const clear = useCallback(() => persist([]), [persist]);

  // Simulate live community vote activity so the bell feels alive.
  const tick = useRef(0);
  useEffect(() => {
    const roster = artists.map((a) => a.name);
    const fans = ["Léa", "Noah", "Mia", "Adam", "Zoé", "Liam", "Inès", "Ravi", "Sofia", "Kenji"];
    const id = window.setInterval(() => {
      tick.current += 1;
      const fan = fans[Math.floor(Math.random() * fans.length)];
      const artist = roster[Math.floor(Math.random() * roster.length)];
      notify("community", "notif.communityVote", { fan, artist });
    }, 32000);
    return () => window.clearInterval(id);
  }, [notify]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const value = useMemo<NotificationsValue>(
    () => ({ notifications, unreadCount, notify, markAllRead, clear }),
    [notifications, unreadCount, notify, markAllRead, clear],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationsProvider");
  return ctx;
}
