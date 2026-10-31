// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { AddToPlaylistButton } from "./AddToPlaylistButton";
import { playableTracks } from "@/audio/tracks";
import { translate, type Lang } from "@/i18n/translations";
import { installFakeAudio } from "@/test/fakeAudio";
import { AllProviders } from "@/test/providers";

const [A, B, C] = playableTracks.filter(
  (t, i, all) => all.findIndex((x) => x.title === t.title) === i,
);

beforeEach(() => {
  window.localStorage.clear();
  installFakeAudio();
});
afterEach(() => cleanup());

async function open(lang: Lang) {
  window.localStorage.setItem("afm-lang", lang);
  window.localStorage.setItem(
    "afm-playlists",
    JSON.stringify([
      { id: "one", name: "Solo", trackIds: [A.id], createdAt: 1 },
      { id: "two", name: "Duo", trackIds: [A.id, B.id], createdAt: 2 },
    ]),
  );
  render(
    <AllProviders>
      <AddToPlaylistButton trackId={C.id} />
    </AllProviders>,
  );
  await act(async () => {}); // the providers read their storage in an effect
  fireEvent.click(screen.getByRole("button", { name: translate(lang, "playlists.addTo") }));
  return await screen.findByRole("dialog");
}

describe("the list of playlists in the add-to-playlist window", () => {
  it("writes each count for one and for two tracks, in French", async () => {
    const box = await open("fr");
    expect(within(box).getByText("1 titre")).toBeTruthy();
    expect(within(box).getByText("2 titres")).toBeTruthy();
  });

  it("in English, Spanish and Arabic as well", async () => {
    let box = await open("en");
    expect(within(box).getByText("1 track")).toBeTruthy();
    expect(within(box).getByText("2 tracks")).toBeTruthy();
    cleanup();
    box = await open("es");
    expect(within(box).getByText("1 canción")).toBeTruthy();
    expect(within(box).getByText("2 canciones")).toBeTruthy();
    cleanup();
    box = await open("ar");
    expect(within(box).getByText("مقطوعة واحدة")).toBeTruthy();
    expect(within(box).getByText("مقطوعتان")).toBeTruthy();
  });

  it("the window itself is written in the language, with no English left (Spanish)", async () => {
    const box = await open("es");
    expect(within(box).getByText(translate("es", "playlists.addToDesc"))).toBeTruthy();
    expect(box.textContent).not.toMatch(/Add to playlist|Pick an existing|Playlist name/);
  });
});
