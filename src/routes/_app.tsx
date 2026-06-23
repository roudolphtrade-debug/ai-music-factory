import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PlayerProvider } from "@/audio/PlayerProvider";
import { LibraryProvider } from "@/library/LibraryProvider";
import { GeneratedDraftsProvider } from "@/library/GeneratedDraftsProvider";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  return (
    <LibraryProvider>
      <GeneratedDraftsProvider>
        <PlayerProvider>
          <AppShell>
            <Outlet />
          </AppShell>
        </PlayerProvider>
      </GeneratedDraftsProvider>
    </LibraryProvider>
  );
}
