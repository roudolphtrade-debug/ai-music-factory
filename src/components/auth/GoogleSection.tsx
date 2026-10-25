import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useEnabledProviders } from "@/auth/useEnabledProviders";
import { signInWithGoogle } from "@/auth/service";
import { useAuthCopy, type AuthKey } from "@/i18n/auth";
import { FormNotice } from "./AuthParts";

/** Google's "G", in its own colours (a brand mark: never recoloured). */
function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" className="h-[18px] w-[18px]">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

/**
 * "Continue with Google", then a divider. It renders nothing at all until the project reports Google as
 * enabled, so no button that cannot work is ever shown.
 */
export function GoogleSection({ destination }: { destination?: string }) {
  const { t } = useAuthCopy();
  const { google } = useEnabledProviders();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<AuthKey | null>(null);
  if (!google) return null;

  const start = async () => {
    setError(null);
    setPending(true);
    const result = await signInWithGoogle(destination);
    // On success the browser leaves for Google: only a failure comes back here.
    if (!result.ok) {
      // Outages and limits keep their own message; anything else is about Google (a refusal of the
      // project, a provider not ready): the generic "Google did not work", never a raw reason.
      const own = ["network", "service_error", "rate_limit"].includes(result.failure.kind);
      setError(own ? result.failure.key : "errGoogle");
      setPending(false);
    }
  };

  return (
    <div className="mb-6 space-y-4" data-testid="google-section">
      {error && <FormNotice tone="error">{t(error)}</FormNotice>}
      <Button
        type="button"
        variant="outline"
        size="xl"
        className="w-full gap-3"
        disabled={pending}
        onClick={start}
      >
        <GoogleMark />
        {t("googleContinue")}
      </Button>
      <div className="flex items-center gap-3 text-xs text-muted-foreground" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        {t("googleOr")}
        <span className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
}
