// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentType } from "react";
import { LanguageProvider, useI18n } from "./context";
import { LANGS } from "./translations";
import { demoContent } from "./demo-content";
import { labels } from "@/data/mock";
import { LabelCard } from "@/components/premium/LabelCard";

vi.mock("@tanstack/react-router", async () => {
  const { routerModule } = await import("@/test/routerMock");
  return {
    ...routerModule,
    createFileRoute: () => (options: unknown) => ({
      options,
      useParams: () => ({ artistId: "art-1" }),
    }),
  };
});
vi.mock("@/components/audio/Playlist", () => ({ Playlist: () => null }));
vi.mock("@/components/premium/VoteButton", () => ({ VoteButton: () => null }));
vi.mock("@/components/voice/ReadAloudButton", () => ({
  ReadAloudButton: ({ text }: { text: string }) => (
    <output data-testid="read-aloud-text">{text}</output>
  ),
}));
import { Route as ArtistRoute } from "@/routes/_app.artists.$artistId";
import { Route as CommunityRoute } from "@/routes/_app.community";

const ArtistPage = ArtistRoute.options.component as ComponentType;
const CommunityPage = CommunityRoute.options.component as ComponentType;
function ChooseLanguage() {
  const { setLang } = useI18n();
  return LANGS.map(({ code }) => (
    <button key={code} onClick={() => setLang(code)}>
      {code}
    </button>
  ));
}
afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("demonstration text follows live language changes", () => {
  it("updates the profile and read-aloud text together without modifying names", () => {
    render(
      <LanguageProvider>
        <ChooseLanguage />
        <ArtistPage />
      </LanguageProvider>,
    );
    for (const { code } of LANGS) {
      fireEvent.click(screen.getByRole("button", { name: code }));
      const copy = demoContent[code].artists["art-1"];
      expect(screen.getByText(copy.tagline)).toBeTruthy();
      expect(screen.getByText(copy.bio)).toBeTruthy();
      expect(screen.getByText(copy.aesthetic)).toBeTruthy();
      expect(screen.getByTestId("read-aloud-text").textContent).toBe(`SØL Aurelius. ${copy.bio}`);
      expect(screen.getByRole("heading", { name: "SØL Aurelius" })).toBeTruthy();
    }
  });

  it("translates all demonstration label cards but preserves an unknown label's text", () => {
    render(
      <LanguageProvider>
        <ChooseLanguage />
        {labels.map((label) => (
          <LabelCard key={label.id} label={label} />
        ))}
        <LabelCard
          label={{ ...labels[0], id: "ul-personal", name: "Mon label", tagline: "My own words" }}
        />
      </LanguageProvider>,
    );
    for (const { code } of LANGS) {
      fireEvent.click(screen.getByRole("button", { name: code }));
      for (const tagline of Object.values(demoContent[code].labels))
        expect(screen.getByText(tagline)).toBeTruthy();
      expect(screen.getByText("My own words")).toBeTruthy();
      expect(screen.getByText("Mon label")).toBeTruthy();
    }
  });

  it("translates the label channel without changing its member count", () => {
    render(
      <LanguageProvider>
        <ChooseLanguage />
        <CommunityPage />
      </LanguageProvider>,
    );
    for (const { code } of LANGS) {
      fireEvent.click(screen.getByRole("button", { name: code }));
      const channel = screen.getByText(demoContent[code].labelHouses);
      expect(channel.closest("button")?.textContent).toContain("620");
    }
  });
});
