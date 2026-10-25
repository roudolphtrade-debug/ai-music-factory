import { loadAuthSettings } from "@/integrations/supabase/client";

export interface EnabledProviders {
  google: boolean;
}

/**
 * Which sign-in providers the project really has switched on. The Google button is shown only when the
 * service itself says Google is enabled (it is, once the owner has saved a Google client ID and secret
 * in the project), and never on a doubt: no answer, an unreadable answer or a refusal means "off".
 */
export async function loadEnabledProviders(): Promise<EnabledProviders> {
  const settings = (await loadAuthSettings()) as { external?: Record<string, unknown> } | null;
  return { google: settings?.external?.google === true };
}
