import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StaticWorkspace } from "@/features/workspace/demo/static-workspace";

function renderWorkspace() {
  render(<StaticWorkspace userEmail="agent@example.com" />);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

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
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      ...navigator,
      clipboard: { writeText },
    });
    renderWorkspace();

    const tab = screen.getByRole("tab", { name: /#48288/i });
    await user.click(tab);

    expect(tab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByLabelText("Open tickets")).toBeInTheDocument();
    const detail = screen.getByLabelText("Ticket detail #48288");
    expect(detail).toBeInTheDocument();
    expect(within(detail).getByText("#48288")).toBeInTheDocument();
    expect(
      within(detail).getByRole("heading", {
        name: "Login loop after password reset",
      }),
    ).toBeInTheDocument();
    expect(detail).toHaveTextContent(/Customer:\s*Daniel Cho/);
    expect(detail).toHaveTextContent(/Owner:\s*N\. Ionescu/);
    expect(detail).toHaveTextContent("Created: May 21, 13:48");
    expect(detail).toHaveTextContent("Updated: 12m ago");
    expect(
      within(detail).getByRole("button", { name: "Open ticket in helpdesk" }),
    ).toBeInTheDocument();
    await user.click(within(detail).getByRole("button", { name: "Copy ticket summary" }));
    expect(writeText).toHaveBeenCalledWith(
      [
        "#48288 Login loop after password reset",
        "Customer: Daniel Cho",
        "Owner: N. Ionescu",
        "Created: May 21, 13:48",
        "Updated: 12m ago",
      ].join("\n"),
    );
    expect(
      within(detail).queryByRole("link", { name: "Open ticket in helpdesk" }),
    ).not.toBeInTheDocument();
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

  it("renders static ticket replies newest first with type-specific surfaces", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByRole("tab", { name: /#48288/i }));

    const replies = within(screen.getByLabelText("Ticket replies")).getAllByRole(
      "article",
    );
    expect(replies).toHaveLength(3);
    expect(replies[0]).toHaveAccessibleName("Customer reply from Daniel Cho");
    expect(replies[1]).toHaveAccessibleName("Employee reply from N. Ionescu");
    expect(replies[2]).toHaveAccessibleName("Internal note from Razvan Rosca");

    expect(replies[0]).toHaveClass("bg-indigo-50", "border-indigo-100");
    expect(replies[1]).toHaveClass("bg-slate-50/40", "border-slate-200");
    expect(replies[2]).toHaveClass("bg-amber-50", "border-amber-200");

    expect(replies[0]).not.toHaveTextContent("Customer reply");
    expect(replies[0]).toHaveTextContent("Daniel Cho");
    expect(replies[0]).toHaveTextContent("daniel.cho@example.com");
    expect(replies[0]).toHaveTextContent("May 24, 08:18");
    expect(replies[0]).not.toHaveTextContent(/To:\s*N. Ionescu/);

    const detailsButton = within(replies[0]).getByRole("button", {
      name: "Message details for Daniel Cho",
    });
    expect(detailsButton).toHaveAttribute("aria-expanded", "false");
    await user.click(detailsButton);
    expect(detailsButton).toHaveAttribute("aria-expanded", "true");

    expect(replies[0]).toHaveTextContent(/From:\s*Daniel Cho/);
    expect(replies[0]).toHaveTextContent(/To:\s*N. Ionescu/);
    expect(replies[0]).toHaveTextContent("Support Team");
    expect(replies[0]).toHaveTextContent(
      "Session appears to restart after MFA challenge on Chrome.",
    );
    expect(
      within(replies[0]).getByLabelText("Message actions for Daniel Cho"),
    ).toBeInTheDocument();
    expect(
      within(replies[2]).queryByLabelText("Message actions for Razvan Rosca"),
    ).not.toBeInTheDocument();
    expect(within(replies[2]).queryByRole("button", { name: "Reply" })).not.toBeInTheDocument();
    expect(within(replies[2]).queryByRole("button", { name: "Reply all" })).not.toBeInTheDocument();
  });

  it("opens an inline static composer from Reply and keeps Send inert", async () => {
    const user = userEvent.setup();
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    renderWorkspace();

    await user.click(screen.getByRole("tab", { name: /#48288/i }));
    const customerReply = screen.getByRole("article", {
      name: "Customer reply from Daniel Cho",
    });

    await user.click(within(customerReply).getByRole("button", { name: "Reply" }));

    const composer = within(customerReply).getByRole("region", {
      name: "Reply composer",
    });
    expect(within(customerReply).getByRole("button", { name: "Reply" })).toHaveClass(
      "bg-indigo-200",
      "hover:bg-indigo-200",
    );
    expect(
      within(customerReply).getByRole("button", { name: "Reply all" }),
    ).not.toHaveClass("bg-indigo-200");
    expect(composer).not.toHaveTextContent(
      "Reply to Daniel Cho by Razvan Rosca · May 24, 08:22",
    );
    expect(within(composer).getByRole("button", { name: "Bold" })).toBeInTheDocument();
    expect(within(composer).getByRole("button", { name: "Italic" })).toBeInTheDocument();
    expect(within(composer).getByRole("button", { name: "Insert link" })).toBeInTheDocument();
    expect(within(composer).getByRole("button", { name: "Bulleted list" })).toBeInTheDocument();
    expect(within(composer).getByRole("button", { name: "Numbered list" })).toBeInTheDocument();

    await user.click(within(composer).getByRole("button", { name: "Send" }));
    expect(fetch).not.toHaveBeenCalled();
    expect(within(screen.getByLabelText("Ticket replies")).getAllByRole("article")).toHaveLength(3);

    await user.click(within(composer).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("region", { name: "Reply composer" })).not.toBeInTheDocument();
  });

  it("opens reply-all wording for the inline static composer", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByRole("tab", { name: /#48288/i }));
    const employeeReply = screen.getByRole("article", {
      name: "Employee reply from N. Ionescu",
    });

    await user.click(
      within(employeeReply).getByRole("button", { name: "Reply all" }),
    );

    expect(
      within(employeeReply).getByRole("button", { name: "Reply all" }),
    ).toHaveClass("bg-slate-200", "hover:bg-slate-200");
    expect(within(employeeReply).getByRole("button", { name: "Reply" })).not.toHaveClass(
      "bg-slate-200",
    );
    expect(
      within(employeeReply).getByRole("region", { name: "Reply composer" }),
    ).not.toHaveTextContent(
      "Reply all to N. Ionescu by Razvan Rosca · May 24, 08:22",
    );
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

  it("groups the ticket table by priority and disables priority sorting", async () => {
    const user = userEvent.setup();
    renderWorkspace();

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
    renderWorkspace();

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
