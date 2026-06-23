import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PlayerProvider } from "@/audio/PlayerProvider";
import { LibraryProvider } from "@/library/LibraryProvider";
import { GeneratedDraftsProvider } from "@/library/GeneratedDraftsProvider";
import { LabelsProvider } from "@/library/LabelsProvider";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  return (
    <LibraryProvider>
      <LabelsProvider>
        <GeneratedDraftsProvider>
          <PlayerProvider>
            <AppShell>
              <Outlet />
            </AppShell>
          </PlayerProvider>
        </GeneratedDraftsProvider>
      </LabelsProvider>
    </LibraryProvider>
  );
}
