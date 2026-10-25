import { useEffect, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { ArrowLeft, Loader2, UserRoundX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/auth/context";
import { AUTH_PATHS } from "@/auth/redirects";
import { useAuthCopy } from "@/i18n/auth";
import { AuthCard } from "./AuthParts";

/** Shown instead of an account screen when the member backend is not configured. */
export function UnavailableCard({ withAction = true }: { withAction?: boolean }) {
  const { t } = useAuthCopy();
  return (
    <AuthCard
      title={t("unavailableTitle")}
      description={t("unavailableDesc")}
      icon={<UserRoundX aria-hidden="true" className="h-5 w-5" />}
    >
      {withAction && (
        <Button asChild variant="gold" size="lg" className="w-full">
          <Link to="/radio">{t("backToDiscovery")}</Link>
        </Button>
      )}
    </AuthCard>
  );
}

export function BackToDiscovery() {
  const { t } = useAuthCopy();
  return (
    <p className="mt-6 text-center text-sm">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--gold)]"
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4 rtl:rotate-180" />
        {t("backToDiscovery")}
      </Link>
    </p>
  );
}

/**
 * Private pages. This is a convenience for the member, not the protection: what belongs to a
 * member is protected in the database by row-level security. Public pages never use it.
 */
export function RequireMember({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const { t } = useAuthCopy();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => {
    // The shell remounts its children on every route change, so this component can be rendered a
    // second time while the router is already on the sign-in page: it must not send the member
    // there again with the sign-in page as the destination.
    if (status === "signedOut" && !pathname.startsWith("/auth")) {
      void navigate({ to: AUTH_PATHS.signIn, search: { redirect: pathname }, replace: true });
    }
  }, [status, pathname, navigate]);

  if (status === "unconfigured") return <UnavailableCard />;
  if (status !== "signedIn") {
    return (
      <div
        role="status"
        className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground"
      >
        <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" />
        {t("loading")}
      </div>
    );
  }
  return <>{children}</>;
}
