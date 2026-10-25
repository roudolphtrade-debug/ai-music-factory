import { useEffect } from "react";
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { Logo } from "@/components/layout/Logo";
import { LanguageSelector } from "@/components/layout/LanguageSelector";
import { BackToDiscovery, UnavailableCard } from "@/components/auth/AuthGate";
import { useAuth } from "@/auth/context";
import { loadSupabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [{ title: "Ai Music Factory" }, { name: "robots", content: "noindex" }],
  }),
  component: AuthLayout,
});

/** Frame shared by the account screens: brand, language, and a way back to the public site. */
function AuthLayout() {
  const { status } = useAuth();
  // Account screens will need the backend: start loading it as soon as one opens.
  useEffect(() => {
    void loadSupabase();
  }, []);
  return (
    <div className="min-h-screen w-full bg-background">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-4 sm:px-8">
        <Link
          to="/"
          aria-label="Ai Music Factory"
          className="rounded-xl focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--gold)]"
        >
          <Logo />
        </Link>
        <LanguageSelector />
      </header>
      <main className="mx-auto w-full max-w-md px-4 pb-16 pt-6 sm:pt-12">
        {status === "unconfigured" ? <UnavailableCard withAction={false} /> : <Outlet />}
        <BackToDiscovery />
      </main>
    </div>
  );
}
