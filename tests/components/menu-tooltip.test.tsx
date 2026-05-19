import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MenuDropdown, ProfileMenu, Tooltip } from "@/components/ui";

describe("MenuDropdown and ProfileMenu", () => {
  it("opens from the keyboard, navigates items, and activates with Enter", async () => {
    const user = userEvent.setup();
    const onSecond = vi.fn();
    render(
      <MenuDropdown
        items={[
          { type: "heading", id: "main", label: "Main" },
          { id: "first", label: "First", onSelect: vi.fn() },
          { id: "second", label: "Second", onSelect: onSecond },
        ]}
        triggerLabel="Actions"
      />,
    );

    screen.getByRole("button", { name: "Actions" }).focus();
    await user.keyboard("{Enter}{ArrowDown}{Enter}");

    expect(onSecond).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("supports profile-style trigger content without app wiring", async () => {
    const user = userEvent.setup();
    render(
      <ProfileMenu
        displayName="Demo User"
        initials="DU"
        items={[{ id: "profile", label: "Profile", onSelect: vi.fn() }]}
        subtitle="Demo profile"
      />,
    );

    await user.click(screen.getByRole("button", { name: /open profile menu/i }));

    expect(screen.getByText("Demo User")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Profile" })).toBeInTheDocument();
  });

  it("closes with Escape and restores focus to the trigger", async () => {
    const user = userEvent.setup();
    render(
      <MenuDropdown
        items={[{ id: "first", label: "First", onSelect: vi.fn() }]}
        triggerLabel="Actions"
      />,
    );

    const trigger = screen.getByRole("button", { name: "Actions" });
    await user.click(trigger);
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});

describe("Tooltip", () => {
  it("opens on focus, links with aria-describedby, and closes on Escape", async () => {
    const user = userEvent.setup();
    render(
      <Tooltip content="More context" delayMs={0}>
        <button type="button">Info</button>
      </Tooltip>,
    );

    const trigger = screen.getByRole("button", { name: "Info" });
    trigger.focus();

    const tooltip = await screen.findByRole("tooltip");
    expect(tooltip).toHaveTextContent("More context");
    expect(trigger.parentElement).toHaveAttribute("aria-describedby");

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
});
