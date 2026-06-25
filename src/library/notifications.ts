/**
 * Lightweight client-side notification model.
 *
 * Notifications cover vote activity (the user's votes and simulated community
 * votes), season events (champion crowned, new season), and payment receipts.
 * Titles are translation keys resolved at render time, with optional vars for
 * dynamic values such as artist names or amounts.
 */

export type NotificationKind = "vote" | "community" | "champion" | "season" | "payment";

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  titleKey: string;
  vars?: Record<string, string | number>;
  at: number;
  read: boolean;
}

export const NOTIF_KEY = "afm-notifications";
export const MAX_NOTIFICATIONS = 40;

export function makeNotification(
  kind: NotificationKind,
  titleKey: string,
  vars?: Record<string, string | number>,
): AppNotification {
  return {
    id: `n-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    kind,
    titleKey,
    vars,
    at: Date.now(),
    read: false,
  };
}
