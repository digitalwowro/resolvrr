import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { StaticWorkspace } from "@/features/workspace";

function renderWorkspace() {
  render(<StaticWorkspace userEmail="agent@example.com" />);
}

describe("StaticWorkspace", () => {
  it("keeps saved view selection in the searchable selector", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByRole("combobox", { name: "Saved view" }));

    expect(screen.getByRole("option", { name: "My work" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Pending reminders" })).not.toBeInTheDocument();
  });

  it("switches ticket tab orientation without persistence", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByRole("combobox", { name: "Tab orientation" }));
    await user.click(screen.getByRole("option", { name: "Vertical tabs" }));

    expect(screen.getByLabelText("Open tickets")).toHaveClass("flex-col");
    expect(screen.getByLabelText("Open tickets")).toHaveClass("overflow-y-auto");
    const listTab = screen.getByRole("tab", { name: "Return to list: My work" });
    expect(listTab).toHaveTextContent("List");
    expect(listTab).toHaveTextContent("My work");
  });

  it("renders a pinned horizontal List tab before ticket tabs", () => {
    renderWorkspace();

    const tabs = screen.getAllByRole("tab");

    expect(tabs[0]).toHaveAccessibleName("Return to list: My work");
    expect(tabs[0]).toHaveTextContent("List");
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(tabs[1]).toHaveAccessibleName(/#48291/i);
    expect(
      screen.queryByRole("button", { name: /Close List/i }),
    ).not.toBeInTheDocument();
  });

  it("opens a ticket context and returns to the table through List", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    const tab = screen.getByRole("tab", { name: /#48288/i });
    await user.click(tab);

    expect(tab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByLabelText("Open tickets")).toBeInTheDocument();
    expect(screen.getByLabelText("Ticket detail #48288")).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Title" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Return to list: My work" }));

    expect(screen.getByRole("columnheader", { name: "Title" })).toBeInTheDocument();
  });

  it("clicking a ticket row switches away from the List context", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    expect(
      screen.getByRole("tab", { name: "Return to list: My work" }),
    ).toHaveAttribute("aria-selected", "true");

    await user.click(
      screen.getByRole("row", {
        name: /Webhook delivery failed overnight/i,
      }),
    );

    expect(screen.getByLabelText("Ticket detail #48277")).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "Return to list: My work" }),
    ).toHaveAttribute("aria-selected", "false");
  });

  it("shows local-only ticket sidebar controls after opening a ticket", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    expect(
      screen.queryByRole("combobox", { name: "Ticket state" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /#48288/i }));

    expect(screen.getByRole("combobox", { name: "Ticket state" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Ticket priority" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Ticket group" })).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Subscribed" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("textbox", { name: "Ticket tags" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add link" })).toBeInTheDocument();
  });

  it("keeps ticket sidebar controls synthetic and local", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByRole("tab", { name: /#48288/i }));

    await user.click(screen.getByRole("combobox", { name: "Ticket state" }));
    expect(screen.getByRole("option", { name: "New" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Open" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Pending Reminder" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Pending Close" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Closed" })).toBeInTheDocument();
    await user.keyboard("{Escape}");

    await user.click(screen.getByRole("combobox", { name: "Ticket priority" }));
    expect(screen.getByRole("option", { name: "Low" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Medium" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "High" })).toBeInTheDocument();
    await user.keyboard("{Escape}");

    await user.click(screen.getByRole("combobox", { name: "Ticket group" }));
    expect(screen.getByRole("option", { name: "Users" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Channel" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Direct Sales" })).toBeInTheDocument();
    await user.keyboard("{Escape}");

    const subscribed = screen.getByRole("switch", { name: "Subscribed" });
    await user.click(subscribed);
    expect(subscribed).toHaveAttribute("aria-checked", "false");

    await user.type(screen.getByRole("textbox", { name: "Ticket tags" }), "billing");
    expect(screen.getByRole("textbox", { name: "Ticket tags" })).toHaveValue("billing");
  });

  it("keeps workspace ticket table columns aligned through one grid template", () => {
    renderWorkspace();

    const table = screen.getByRole("table", { name: "Tickets" });
    const grid = table.firstElementChild;

    expect(grid).toHaveStyle({
      gridTemplateColumns:
        "max-content max-content minmax(0, 1fr) fit-content(14rem) max-content max-content max-content max-content max-content",
    });
  });

  it("keeps checkbox clicks from opening the ticket context", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByRole("checkbox", { name: "Select #48277" }));

    expect(screen.queryByLabelText("Ticket detail #48277")).not.toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "Return to list: My work" }),
    ).toHaveAttribute("aria-selected", "true");
  });

  it("collapses crowded horizontal tabs to icon-only with tab details", async () => {
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
      bottom: 0,
      height: 0,
      left: 0,
      right: 100,
      toJSON: () => ({}),
      top: 0,
      width: 100,
      x: 0,
      y: 0,
    });
    const user = userEvent.setup();
    renderWorkspace();

    await waitFor(() => {
      expect(screen.getByLabelText(/more tabs$/)).toBeInTheDocument();
    });

    await user.hover(screen.getByLabelText(/more tabs$/));
    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "more tabs are open. Close tabs to show more, or switch to vertical tabs.",
    );

    await user.hover(screen.getByRole("tab", { name: "#48291" }));

    const ticketTooltip = await screen.findByRole("tooltip");
    expect(ticketTooltip).toHaveTextContent(
      "#48291 · Billing follow-up for annual renewal · Maya Patel",
    );
    expect(ticketTooltip).toHaveTextContent(
      "R. Rosca · Open · High",
    );
  });

  it("supports local row selection and column visibility", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByRole("checkbox", { name: "Select all tickets" }));
    expect(screen.getByRole("checkbox", { name: "Select #48291" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Select #48260" })).toBeChecked();

    await user.click(screen.getByRole("button", { name: "Column visibility" }));
    await user.click(screen.getByRole("menuitem", { name: "Customer" }));

    expect(screen.queryByText("Maya Patel")).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Select #48291" })).toBeChecked();
  });

  it("changes visual workspace selection through the compact profile menu", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByRole("button", { name: /open profile menu/i }));
    const menu = screen.getByRole("menu");
    const selectedWorkspace = within(menu).getByRole("menuitem", {
      name: "Northwind Support",
    });
    expect(selectedWorkspace).toHaveClass("text-indigo-700", "bg-transparent");
    expect(selectedWorkspace).toContainHTML("lucide-building");
    expect(selectedWorkspace).toContainHTML("lucide-check");

    await user.click(within(menu).getByRole("menuitem", { name: "Contoso Care" }));

    expect(
      screen.getByRole("button", { name: /open profile menu, contoso care/i }),
    ).toBeInTheDocument();
  });

  it("renders the agreed table columns and omits the state review control", () => {
    renderWorkspace();

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
