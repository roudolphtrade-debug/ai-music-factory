import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PlayerProvider } from "@/audio/PlayerProvider";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  return (
    <PlayerProvider>
      <AppShell>
        <Outlet />
      </AppShell>
    </PlayerProvider>
  );
}
