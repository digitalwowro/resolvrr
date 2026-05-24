import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderStaticWorkspace } from "./static-workspace-test-utils";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("StaticWorkspace table", () => {
  it("keeps workspace ticket table columns aligned through one grid template", () => {
    renderStaticWorkspace();

    const table = screen.getByRole("table", { name: "Tickets" });
    const grid = table.firstElementChild;

    expect(grid).toHaveStyle({
      gridTemplateColumns:
        "max-content max-content minmax(0, 1fr) fit-content(14rem) max-content max-content max-content max-content max-content",
    });
  });

  it("groups the ticket table by priority and disables priority sorting", async () => {
    const user = userEvent.setup();
    renderStaticWorkspace();

    const priorityHeaderBeforeGrouping = screen.getByRole("columnheader", {
      name: "Priority",
    });
    await user.click(
      within(priorityHeaderBeforeGrouping).getByRole("button", {
        name: "Priority",
      }),
    );
    expect(priorityHeaderBeforeGrouping).toHaveAttribute("aria-sort", "ascending");

    await user.click(screen.getByRole("combobox", { name: "Group tickets by" }));

    expect(screen.getByRole("option", { name: "No grouping" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Priority" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "State" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Owner" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Customer" })).toBeInTheDocument();

    await user.click(screen.getByRole("option", { name: "Priority" }));

    const highGroup = screen.getByRole("cell", { name: /^High \d+$/ });
    expect(highGroup).toHaveStyle({ gridColumn: "1 / -1" });
    expect(screen.getByRole("cell", { name: /^Medium \d+$/ })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: /^Low \d+$/ })).toBeInTheDocument();

    const priorityHeader = screen.getByRole("columnheader", { name: "Priority" });
    expect(within(priorityHeader).getByRole("button", { name: "Priority" })).toBeDisabled();
    expect(screen.getByRole("columnheader", { name: "Updated at" })).toHaveAttribute(
      "aria-sort",
      "descending",
    );

    const stateHeader = screen.getByRole("columnheader", { name: "State" });
    await user.click(within(stateHeader).getByRole("button", { name: "State" }));
    expect(stateHeader).toHaveAttribute("aria-sort", "ascending");
    await user.click(highGroup);
    expect(screen.queryByLabelText(/^Ticket detail/)).not.toBeInTheDocument();
  });

  it("restores flat ticket table sorting when grouping returns to none", async () => {
    const user = userEvent.setup();
    renderStaticWorkspace();

    await user.click(screen.getByRole("combobox", { name: "Group tickets by" }));
    await user.click(screen.getByRole("option", { name: "Priority" }));
    await user.click(screen.getByRole("combobox", { name: "Group tickets by" }));
    await user.click(screen.getByRole("option", { name: "No grouping" }));

    expect(screen.queryByRole("cell", { name: /^High \d+$/ })).not.toBeInTheDocument();
    expect(
      within(screen.getByRole("columnheader", { name: "Priority" })).getByRole(
        "button",
        { name: "Priority" },
      ),
    ).toBeEnabled();
  });

  it("keeps checkbox clicks from opening the ticket context", async () => {
    const user = userEvent.setup();
    renderStaticWorkspace();

    await user.click(screen.getByRole("checkbox", { name: "Select #48277" }));

    expect(screen.queryByLabelText("Ticket detail #48277")).not.toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "Return to list: My work" }),
    ).toHaveAttribute("aria-selected", "true");
  });

  it("renders the agreed table columns and omits the state review control", () => {
    renderStaticWorkspace();

    expect(screen.getByRole("columnheader", { name: "#" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Title" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Customer" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Owner" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "State" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Priority" })).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Pending till" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Updated at" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "State preview" })).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Workspace" })).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "SLA" })).not.toBeInTheDocument();
  });
});
