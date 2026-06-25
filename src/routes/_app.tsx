import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PlayerProvider } from "@/audio/PlayerProvider";
import { LibraryProvider } from "@/library/LibraryProvider";
import { GeneratedDraftsProvider } from "@/library/GeneratedDraftsProvider";
import { LabelsProvider } from "@/library/LabelsProvider";
import { CreditsProvider } from "@/library/CreditsProvider";
import { BattlesProvider } from "@/library/BattlesProvider";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  return (
    <CreditsProvider>
      <LibraryProvider>
        <LabelsProvider>
          <BattlesProvider>
            <GeneratedDraftsProvider>
              <PlayerProvider>
                <AppShell>
                  <Outlet />
                </AppShell>
              </PlayerProvider>
            </GeneratedDraftsProvider>
          </BattlesProvider>
        </LabelsProvider>
      </LibraryProvider>
    </CreditsProvider>
  );
}

