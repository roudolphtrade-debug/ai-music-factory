/**
 * The address a member just signed up with, kept for this tab only (sessionStorage) so the
 * "link expired" page can offer to send a new link without asking again.
 */
export const PENDING_EMAIL_KEY = "afm-pending-email";

export function readPendingEmail(): string {
  try {
    return sessionStorage.getItem(PENDING_EMAIL_KEY) ?? "";
  } catch {
    return "";
  }
}

export function clearPendingEmail() {
  try {
    sessionStorage.removeItem(PENDING_EMAIL_KEY);
  } catch {
    /* ignore */
  }
}
