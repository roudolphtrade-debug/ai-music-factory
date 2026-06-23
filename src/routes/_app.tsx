import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PlayerProvider } from "@/audio/PlayerProvider";
import { LibraryProvider } from "@/library/LibraryProvider";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  return (
    <LibraryProvider>
      <PlayerProvider>
        <AppShell>
          <Outlet />
        </AppShell>
      </PlayerProvider>
    </LibraryProvider>
  );
}
