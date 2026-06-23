import { useState, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { SidebarContent } from "./SidebarContent";
import { Topbar } from "./Topbar";
import { AudioPlayer } from "@/components/premium/AudioPlayer";
import { IntroOverlay } from "@/components/IntroOverlay";
import { Sheet, SheetContent } from "@/components/ui/sheet";

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen w-full bg-background">
      <IntroOverlay />
      {/* Desktop sidebar — fixed */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-sidebar-border lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 border-sidebar-border p-0">
          <SidebarContent onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="lg:pl-72">
        <Topbar onMenu={() => setMobileOpen(true)} />
        <main className="mx-auto w-full max-w-7xl px-4 pb-40 pt-6 sm:px-6 lg:px-10">
          <div key={pathname} className="animate-route-in">
            {children}
          </div>
        </main>
      </div>

      {/* Global mock player */}
      <div className="fixed inset-x-0 bottom-0 z-30 lg:pl-72">
        <AudioPlayer />
      </div>
    </div>
  );
}
