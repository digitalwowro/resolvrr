import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  DropdownSelect,
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

describe("DropdownSelect", () => {
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

describe("SearchableDropdown", () => {
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
