import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MenuDropdown, ProfileMenu } from "@/components/ui";

describe("MenuDropdown and ProfileMenu", () => {
  it("uses the shared dropdown shell and row rhythm", async () => {
    const user = userEvent.setup();
    render(
      <MenuDropdown
        items={[{ id: "first", label: "First", onSelect: vi.fn() }]}
        triggerLabel="Actions"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Actions" }));

    expect(screen.getByRole("menu")).toHaveClass(
      "box-border",
      "w-full",
      "max-w-sm",
      "text-sm",
    );
    expect(screen.getByRole("menu")).not.toHaveClass("w-max", "min-w-full");
    expect(screen.getByRole("menuitem", { name: "First" })).toHaveClass(
      "h-8",
      "w-full",
      "px-2",
      "rounded-md",
      "text-slate-800",
    );
    expect(screen.getByRole("menuitem", { name: "First" })).not.toHaveClass(
      "min-w-full",
    );
  });

  it("renders selected menu items like selected dropdown options", async () => {
    const user = userEvent.setup();
    render(
      <MenuDropdown
        items={[
          { id: "selected", label: "Selected", selected: true, onSelect: vi.fn() },
          { id: "other", label: "Other", onSelect: vi.fn() },
        ]}
        triggerLabel="Actions"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Actions" }));

    expect(screen.getByRole("menuitem", { name: "Selected" })).toHaveClass(
      "text-indigo-700",
      "bg-transparent",
      "hover:bg-transparent",
    );
    expect(screen.getByRole("menuitem", { name: "Selected" })).toContainHTML(
      "lucide-check",
    );
    expect(screen.getByRole("menuitem", { name: "Other" })).toHaveClass(
      "text-slate-800",
      "hover:bg-indigo-50",
    );
    expect(screen.getByRole("menuitem", { name: "Other" })).not.toContainHTML(
      "lucide-check",
    );
  });

  it("opens from the keyboard, navigates items, and activates with Enter", async () => {
    const user = userEvent.setup();
    const onFirst = vi.fn();
    render(
      <MenuDropdown
        items={[
          { type: "heading", id: "main", label: "Main" },
          { id: "first", label: "First", onSelect: onFirst },
          { id: "second", label: "Second", onSelect: vi.fn() },
        ]}
        triggerLabel="Actions"
      />,
    );

    screen.getByRole("button", { name: "Actions" }).focus();
    await user.keyboard("{Enter}{ArrowDown}{Enter}");

    expect(onFirst).toHaveBeenCalledTimes(1);
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

    expect(screen.getAllByText("Demo User").length).toBeGreaterThan(0);
    expect(screen.getByRole("menu")).toHaveClass(
      "top-full",
      "w-full",
      "max-w-sm",
      "text-sm",
    );
    expect(screen.getByRole("menu")).not.toHaveClass("w-max", "min-w-full");
    expect(screen.getByRole("menuitem", { name: "Profile" })).toHaveClass(
      "h-8",
      "px-2",
      "text-slate-800",
    );
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

  it("cycles first-letter typeahead through actionable items only", async () => {
    const user = userEvent.setup();
    const onArchive = vi.fn();
    render(
      <MenuDropdown
        items={[
          { type: "heading", id: "heading", label: "Archive heading" },
          { id: "alpha", label: "Alpha", onSelect: vi.fn() },
          { type: "separator", id: "separator" },
          { id: "archive", label: "Archive", onSelect: onArchive },
        ]}
        triggerLabel="Actions"
      />,
    );

    screen.getByRole("button", { name: "Actions" }).focus();
    await user.keyboard("{Enter}aa{Enter}");

    expect(onArchive).toHaveBeenCalledTimes(1);
  });
});
