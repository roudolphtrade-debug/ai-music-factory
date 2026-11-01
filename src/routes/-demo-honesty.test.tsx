// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ComponentType } from "react";
import { AllProviders } from "@/test/providers";
import { NotificationsProvider } from "@/library/NotificationsProvider";
import { BattlesProvider } from "@/library/BattlesProvider";
import { demoHonesty } from "@/i18n/demo-honesty";
import { LANGS, translate, type Lang } from "@/i18n/translations";

vi.mock("@tanstack/react-router", async () => (await import("@/test/routerMock")).routerModule);

import { Route as analytics } from "./_app.analytics";
import { Route as community } from "./_app.community";
import { Route as battles } from "./_app.battles";
import { Route as avatarLab } from "./_app.avatar-lab";

const pageOf = (route: unknown) =>
  (route as { options: { component: ComponentType } }).options.component;
const langs = LANGS.map((l) => l.code) as Lang[];

beforeEach(() => localStorage.clear());
afterEach(cleanup);

function mount(route: unknown, lang: Lang = "fr") {
  localStorage.setItem("afm-lang", lang);
  const Page = pageOf(route);
  return render(
    <AllProviders>
      <NotificationsProvider>
        <BattlesProvider>
          <Page />
        </BattlesProvider>
      </NotificationsProvider>
    </AllProviders>,
  );
}

describe("the honesty catalog", () => {
  it("has the same non-empty texts in the six languages", () => {
    const keys = Object.keys(demoHonesty.fr);
    for (const lang of langs) {
      expect(Object.keys(demoHonesty[lang]), lang).toEqual(keys);
      for (const key of keys) {
        expect(
          (demoHonesty[lang] as Record<string, string>)[key].length,
          `${lang} ${key}`,
        ).toBeGreaterThan(3);
      }
    }
  });
});

describe("Statistics · the figures are labelled as a demo and the chart draws its bars", () => {
  it.each(langs)(
    "%s: a demo notice, one demo marker per figure, a named chart with seven bars",
    (lang) => {
      mount(analytics, lang);
      const demo = translate(lang, "nav.demo");
      expect(screen.getByRole("note").textContent).toContain(demoHonesty[lang].demoStats);
      expect(screen.getAllByText(demo).length).toBeGreaterThanOrEqual(7);
      const chart = screen.getByRole("img", { name: demoHonesty[lang].chartLabel });
      const bars = Array.from(chart.querySelectorAll<HTMLElement>("[style*='height']"));
      expect(bars).toHaveLength(7);
      expect(Math.max(...bars.map((b) => parseFloat(b.style.height)))).toBe(100);
      // The columns stretch to the chart: the bar heights are percentages of a real height.
      expect(chart.className).toContain("items-stretch");
      expect(chart.className).not.toContain("items-end");
    },
  );
});

describe("No visible control is silently inert", () => {
  it.each(langs)(
    "%s Community: posting, circles are disabled and explained; reactions are not buttons",
    (lang) => {
      mount(community, lang);
      const note = (text: string) => screen.getByText(text);
      const post = screen.getByRole("button", {
        name: new RegExp(
          translate(lang, "community.newPost").replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        ),
      });
      expect((post as HTMLButtonElement).disabled).toBe(true);
      expect(post.getAttribute("aria-describedby")).toBe(note(demoHonesty[lang].noPosting).id);
      const circles = screen.getByRole("button", {
        name: translate(lang, "community.discoverCircles"),
      });
      expect((circles as HTMLButtonElement).disabled).toBe(true);
      for (const button of screen.getAllByRole("button")) {
        expect(
          (button as HTMLButtonElement).disabled ||
            button.getAttribute("aria-haspopup") ||
            button.closest("[role='dialog']"),
          `enabled button without a job: ${button.textContent}`,
        ).toBeTruthy();
      }
      expect(screen.getByText(demoHonesty[lang].demoContent)).toBeTruthy();
    },
  );

  it("Battles: the join button is disabled and described", () => {
    mount(battles);
    const join = screen.getByRole("button", { name: translate("fr", "battles.joinNext") });
    expect((join as HTMLButtonElement).disabled).toBe(true);
    expect(join.getAttribute("aria-describedby")).toBe(
      screen.getByText(demoHonesty.fr.noBattle).id,
    );
  });

  it("Avatar Lab: Generate is off (AI paused), Randomize really changes the style and the sliders", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    mount(avatarLab);
    const generate = screen.getByRole("button", { name: translate("fr", "avatarLab.generate") });
    expect((generate as HTMLButtonElement).disabled).toBe(true);
    expect(generate.getAttribute("aria-describedby")).toBe(
      screen.getByText(demoHonesty.fr.aiPaused).id,
    );
    const before = screen.getAllByRole("slider").map((s) => (s as HTMLInputElement).value);
    expect(before).toEqual(["78", "64", "52", "88"]);
    fireEvent.click(screen.getByRole("button", { name: translate("fr", "avatarLab.randomize") }));
    const after = screen.getAllByRole("slider").map((s) => (s as HTMLInputElement).value);
    expect(after).toEqual(["100", "100", "100", "100"]);
    expect(within(document.body).getAllByText(/Neon Visor/).length).toBeGreaterThan(0);
  });
});
