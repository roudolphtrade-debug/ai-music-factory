import type { ReactNode } from "react";
import { LanguageProvider } from "@/i18n/context";
import { LibraryProvider } from "@/library/LibraryProvider";
import { PlaylistsProvider } from "@/library/PlaylistsProvider";
import { PlayerProvider } from "@/audio/PlayerProvider";

/**
 * The provider stack that audio and library components rely on, in the same order as `_app.tsx`.
 * The language comes from `localStorage["afm-lang"]` (default: French).
 */
export function AllProviders({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <LibraryProvider>
        <PlaylistsProvider>
          <PlayerProvider>{children}</PlayerProvider>
        </PlaylistsProvider>
      </LibraryProvider>
    </LanguageProvider>
  );
}
