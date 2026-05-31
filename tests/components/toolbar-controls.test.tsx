import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  Button,
  DropdownSelect,
  MenuDropdown,
  SearchableDropdown,
  ToolbarButton,
  ToolbarDropdownSelect,
  ToolbarMenuDropdown,
  ToolbarSearchableDropdown,
  type DropdownOption,
} from "@/components/ui";

const options: DropdownOption[] = [
  { value: "open", label: "Open tickets" },
  { value: "pending", label: "Pending reminders" },
];

function ToolbarSelectHarness() {
  const [value, setValue] = useState("open");
  return (
    <ToolbarDropdownSelect
      ariaLabel="Toolbar select"
      onValueChange={setValue}
      options={options}
      value={value}
    />
  );
}

function ToolbarSearchableHarness() {
  const [value, setValue] = useState("open");
  return (
    <ToolbarSearchableDropdown
      ariaLabel="Toolbar searchable"
      onValueChange={setValue}
      options={options}
      searchPlaceholder="Find option"
      value={value}
    />
  );
}

describe("Toolbar controls", () => {
  it("renders header-sized toolbar button and dropdown triggers", () => {
    render(
      <>
        <ToolbarButton>Refresh list</ToolbarButton>
        <ToolbarDropdownSelect
          ariaLabel="Toolbar select"
          onValueChange={vi.fn()}
          options={options}
          value="open"
        />
        <ToolbarSearchableDropdown
          ariaLabel="Toolbar searchable"
          onValueChange={vi.fn()}
          options={options}
          value="open"
        />
        <ToolbarMenuDropdown
          items={[{ id: "assign", label: "Assign owner", onSelect: vi.fn() }]}
          triggerLabel="Toolbar menu"
        />
      </>,
    );

    const controls = [
      screen.getByRole("button", { name: "Refresh list" }),
      screen.getByRole("combobox", { name: "Toolbar select" }),
      screen.getByRole("combobox", { name: "Toolbar searchable" }),
      screen.getByRole("button", { name: "Toolbar menu" }),
    ];

    for (const control of controls) {
      expect(control).toHaveClass(
        "!h-8",
        "!px-3",
        "!text-sm",
        "!gap-1.5",
        "!font-normal",
      );
    }
  });

  it("leaves base button and dropdown trigger defaults unchanged", () => {
    render(
      <>
        <Button>Base button</Button>
        <DropdownSelect
          ariaLabel="Base select"
          onValueChange={vi.fn()}
          options={options}
          value="open"
        />
        <SearchableDropdown
          ariaLabel="Base searchable"
          onValueChange={vi.fn()}
          options={options}
          value="open"
        />
        <MenuDropdown
          items={[{ id: "assign", label: "Assign owner", onSelect: vi.fn() }]}
          triggerLabel="Base menu"
        />
      </>,
    );

    expect(screen.getByRole("button", { name: "Base button" })).toHaveClass("h-9");
    expect(screen.getByRole("combobox", { name: "Base select" })).toHaveClass("h-9");
    expect(screen.getByRole("combobox", { name: "Base searchable" })).toHaveClass("h-9");
    expect(screen.getByRole("button", { name: "Base menu" })).toHaveClass("h-9");
  });

  it("keeps wrapped dropdown behavior delegated to base primitives", async () => {
    const user = userEvent.setup();
    const onMenuSelect = vi.fn();
    render(
      <>
        <ToolbarSelectHarness />
        <ToolbarSearchableHarness />
        <ToolbarMenuDropdown
          items={[{ id: "assign", label: "Assign owner", onSelect: onMenuSelect }]}
          triggerLabel="Toolbar menu"
        />
      </>,
    );

    await user.click(screen.getByRole("combobox", { name: "Toolbar select" }));
    await user.click(screen.getByRole("option", { name: "Pending reminders" }));
    expect(screen.getByRole("combobox", { name: "Toolbar select" })).toHaveTextContent(
      "Pending reminders",
    );

    await user.click(screen.getByRole("combobox", { name: "Toolbar searchable" }));
    await user.type(screen.getByPlaceholderText("Find option"), "pending");
    await user.click(screen.getByRole("option", { name: "Pending reminders" }));
    expect(screen.getByRole("combobox", { name: "Toolbar searchable" })).toHaveTextContent(
      "Pending reminders",
    );

    await user.click(screen.getByRole("button", { name: "Toolbar menu" }));
    await user.click(within(screen.getByRole("menu")).getByRole("menuitem"));
    expect(onMenuSelect).toHaveBeenCalledTimes(1);
  });

  it("keeps toolbar dropdown children at the trigger font size", async () => {
    const user = userEvent.setup();
    render(
      <>
        <ToolbarDropdownSelect
          ariaLabel="Toolbar select"
          onValueChange={vi.fn()}
          options={options}
          value="open"
        />
        <ToolbarSearchableDropdown
          ariaLabel="Toolbar searchable"
          onValueChange={vi.fn()}
          options={options}
          value="open"
        />
        <ToolbarMenuDropdown
          items={[{ id: "assign", label: "Assign owner", onSelect: vi.fn() }]}
          triggerLabel="Toolbar menu"
        />
      </>,
    );

    await user.click(screen.getByRole("combobox", { name: "Toolbar select" }));
    expect(screen.getByRole("listbox")).toHaveClass("!text-sm");
    expect(screen.getByRole("option", { name: "Open tickets" })).toHaveClass(
      "text-indigo-700",
    );
    expect(screen.getByRole("option", { name: "Pending reminders" })).toHaveClass(
      "text-slate-800",
    );

    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("combobox", { name: "Toolbar searchable" }));
    expect(screen.getByRole("listbox")).toHaveClass("!text-sm");
    expect(screen.getByRole("option", { name: "Open tickets" })).toHaveClass(
      "text-indigo-700",
    );
    expect(screen.getByRole("option", { name: "Pending reminders" })).toHaveClass(
      "text-slate-800",
    );

    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "Toolbar menu" }));
    expect(screen.getByRole("menu")).toHaveClass("!text-sm");
    expect(screen.getByRole("menuitem", { name: "Assign owner" })).toHaveClass(
      "text-slate-800",
    );
  });
});
