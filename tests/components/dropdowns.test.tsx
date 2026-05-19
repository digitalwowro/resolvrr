import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  DropdownSelect,
  MenuDropdown,
  SearchableDropdown,
  type DropdownOption,
} from "@/components/ui";

const options: DropdownOption[] = [
  { value: "alpha", label: "Alpha" },
  { value: "archive", label: "Archive" },
  { value: "beta", label: "Beta" },
  { value: "disabled", label: "Disabled", disabled: true },
];

function DropdownHarness() {
  const [value, setValue] = useState<string | undefined>();
  return (
    <DropdownSelect
      label="Queue"
      onValueChange={setValue}
      options={options}
      placeholder="Choose queue"
      value={value}
    />
  );
}

function SearchableHarness({ onChange = vi.fn() }: { onChange?: (value: string) => void }) {
  const [value, setValue] = useState<string | undefined>();
  return (
    <SearchableDropdown
      label="Assignee"
      onValueChange={(nextValue) => {
        setValue(nextValue);
        onChange(nextValue);
      }}
      options={options}
      placeholder="Choose assignee"
      value={value}
    />
  );
}

function MenuHarness() {
  return (
    <MenuDropdown
      items={[
        { id: "short", label: "Short", onSelect: vi.fn() },
        { id: "long", label: "Much wider action label", onSelect: vi.fn() },
      ]}
      triggerLabel="Actions"
    />
  );
}

describe("DropdownSelect", () => {
  it("uses content-driven trigger and menu width classes", async () => {
    const user = userEvent.setup();
    render(<DropdownHarness />);

    const trigger = screen.getByRole("combobox", { name: "Queue" });
    await user.click(trigger);

    expect(trigger.parentElement).toHaveClass("w-max", "min-w-full", "max-w-sm");
    expect(trigger).toHaveClass("w-full", "col-start-1", "row-start-1");
    expect(trigger).not.toHaveClass("min-w-40");
    expect(screen.getByRole("listbox")).toHaveClass(
      "w-max",
      "min-w-full",
      "max-w-sm",
      "w-full",
      "shadow-lg",
    );
    expect(screen.getByRole("option", { name: "Alpha" })).toHaveClass(
      "h-8",
      "min-w-full",
      "px-2",
      "rounded-md",
      "text-sm",
    );
  });

  it("opens with the keyboard and selects the highlighted option", async () => {
    const user = userEvent.setup();
    render(<DropdownHarness />);

    const trigger = screen.getByRole("combobox", { name: "Queue" });
    await user.click(trigger);
    await user.keyboard("{ArrowDown}{Enter}");

    expect(trigger).toHaveTextContent("Archive");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("cycles repeated first-letter typeahead matches", async () => {
    const user = userEvent.setup();
    render(<DropdownHarness />);

    const trigger = screen.getByRole("combobox", { name: "Queue" });
    trigger.focus();
    await user.keyboard("{Enter}aa{Enter}");

    expect(trigger).toHaveTextContent("Archive");
  });
});

describe("MenuDropdown", () => {
  it("uses measured trigger ownership for styled menu dropdowns", async () => {
    const user = userEvent.setup();
    render(<MenuHarness />);

    const trigger = screen.getByRole("button", { name: "Actions" });
    await user.click(trigger);

    expect(trigger.parentElement).toHaveClass("w-max", "min-w-full", "max-w-sm");
    expect(trigger).toHaveClass("w-full", "col-start-1", "row-start-1");
    expect(screen.getByRole("menu")).toHaveClass(
      "w-max",
      "min-w-full",
      "max-w-sm",
      "w-full",
    );
  });
});

describe("SearchableDropdown", () => {
  it("keeps the open search input from controlling menu width", async () => {
    const user = userEvent.setup();
    render(<SearchableHarness />);

    await user.click(screen.getByRole("combobox", { name: "Assignee" }));

    const searchInput = screen.getByRole("combobox", { name: "Assignee" });
    const placeholderTrigger = searchInput.parentElement?.previousElementSibling;
    expect(placeholderTrigger?.parentElement).toHaveClass(
      "w-max",
      "min-w-full",
      "max-w-sm",
    );
    expect(placeholderTrigger).toHaveClass(
      "pointer-events-none",
      "w-full",
      "opacity-0",
    );
    expect(searchInput).toHaveClass("min-w-0");
    expect(screen.getByRole("listbox")).toHaveClass(
      "w-max",
      "min-w-full",
      "max-w-sm",
      "top-full",
    );
    expect(screen.getByPlaceholderText("Search")).toHaveClass("w-0", "min-w-0");
  });

  it("shows all options on open and focuses the search input", async () => {
    const user = userEvent.setup();
    render(<SearchableHarness />);

    await user.click(screen.getByRole("combobox", { name: "Assignee" }));

    const listbox = screen.getByRole("listbox");
    expect(within(listbox).getByText("Alpha")).toBeInTheDocument();
    expect(within(listbox).getByText("Beta")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search")).toHaveFocus();
  });

  it("filters after typing and Enter selects the sole result", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SearchableHarness onChange={onChange} />);

    await user.click(screen.getByRole("combobox", { name: "Assignee" }));
    await user.type(screen.getByPlaceholderText("Search"), "bet");
    await user.keyboard("{Enter}");

    expect(onChange).toHaveBeenCalledWith("beta");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("uses Arrow keys to select the highlighted result and Escape to close", async () => {
    const user = userEvent.setup();
    render(<SearchableHarness />);

    await user.click(screen.getByRole("combobox", { name: "Assignee" }));
    await user.keyboard("{ArrowDown}{Enter}");

    expect(screen.getByRole("combobox", { name: "Assignee" })).toHaveTextContent(
      "Archive",
    );

    await user.click(screen.getByRole("combobox", { name: "Assignee" }));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("closes on outside click", async () => {
    const user = userEvent.setup();
    render(
      <>
        <SearchableHarness />
        <button type="button">Outside</button>
      </>,
    );

    await user.click(screen.getByRole("combobox", { name: "Assignee" }));
    await user.click(screen.getByRole("button", { name: "Outside" }));

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
