// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { SectionHeading } from "./SectionHeading";

afterEach(() => cleanup());

describe("the action of a section heading may fold on a phone", () => {
  it("is held at its full width from the small breakpoint up, and may shrink below it", () => {
    render(<SectionHeading title="Title" action={<button type="button">Act</button>} />);
    const wrapper = screen.getByRole("button", { name: "Act" }).parentElement as HTMLElement;
    // `shrink-0` alone would force a row of buttons wider than a 375 px screen: horizontal scroll
    expect(wrapper.className.split(/\s+/)).toContain("sm:shrink-0");
    expect(wrapper.className.split(/\s+/)).not.toContain("shrink-0");
  });

  it("still shows the eyebrow, the title, the description and the action", () => {
    render(
      <SectionHeading eyebrow="Eyebrow" title="Title" description="Description" action={<span>Action</span>} />,
    );
    for (const text of ["Eyebrow", "Title", "Description", "Action"]) expect(screen.getByText(text)).toBeTruthy();
  });

  it("without an action, no empty wrapper is left", () => {
    const { container } = render(<SectionHeading title="Alone" />);
    expect(container.querySelectorAll("[class~='sm:shrink-0']")).toHaveLength(0);
  });
});
