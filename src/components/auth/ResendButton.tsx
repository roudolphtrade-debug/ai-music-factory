import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Result } from "@/auth/service";
import { useCooldown } from "@/auth/useCooldown";
import { useAuthCopy, type AuthKey } from "@/i18n/auth";
import { FormNotice } from "./AuthParts";

export const RESEND_COOLDOWN_SECONDS = 60;

/**
 * "Send the link again", spaced by a countdown so the member cannot hammer the mail service. With
 * `startCounting` the countdown begins at once (the link was just sent).
 */
export function ResendButton({
  email,
  send,
  label,
  successKey = "resent",
  startCounting = false,
}: {
  email: string;
  send: (email: string) => Promise<Result>;
  label: string;
  successKey?: AuthKey;
  startCounting?: boolean;
}) {
  const { t } = useAuthCopy();
  const { remaining, start } = useCooldown(RESEND_COOLDOWN_SECONDS);
  const [pending, setPending] = useState(false);
  const [note, setNote] = useState<{ tone: "success" | "error"; key: AuthKey } | null>(null);

  useEffect(() => {
    if (startCounting) start();
    // The countdown starts once, when the panel appears.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onClick = async () => {
    setPending(true);
    setNote(null);
    const result = await send(email);
    setPending(false);
    if (result.ok) {
      setNote({ tone: "success", key: successKey });
      start();
    } else {
      setNote({ tone: "error", key: result.failure.key });
      if (result.failure.kind === "rate_limit") start();
    }
  };

  const blocked = pending || remaining > 0;
  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="ghost-gold"
        size="lg"
        className="w-full"
        disabled={blocked}
        aria-disabled={blocked}
        onClick={onClick}
      >
        {pending && (
          <Loader2 aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
        )}
        {remaining > 0 ? t("resendIn", { s: remaining }) : label}
      </Button>
      {note && <FormNotice tone={note.tone}>{t(note.key)}</FormNotice>}
    </div>
  );
}
