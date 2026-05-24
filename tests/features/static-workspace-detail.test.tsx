import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderStaticWorkspace } from "./static-workspace-test-utils";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("StaticWorkspace detail", () => {
  it("shows local-only ticket sidebar controls after opening a ticket", async () => {
    const user = userEvent.setup();
    renderStaticWorkspace();

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
    renderStaticWorkspace();

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
    expect(
      within(replies[2]).queryByRole("button", { name: "Reply" }),
    ).not.toBeInTheDocument();
    expect(
      within(replies[2]).queryByRole("button", { name: "Reply all" }),
    ).not.toBeInTheDocument();
  });

  it("opens an inline static composer from Reply and keeps Send inert", async () => {
    const user = userEvent.setup();
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    renderStaticWorkspace();

    await user.click(screen.getByRole("tab", { name: /#48288/i }));
    const customerReply = screen.getByRole("article", {
      name: "Customer reply from Daniel Cho",
    });

    await user.click(within(customerReply).getByRole("button", { name: "Reply" }));

    const composer = within(customerReply).getByRole("region", {
      name: "Reply composer",
    });
    expect(
      within(customerReply).getByRole("button", { name: "Reply" }),
    ).toHaveClass("bg-indigo-200", "hover:bg-indigo-200");
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
    expect(
      within(screen.getByLabelText("Ticket replies")).getAllByRole("article"),
    ).toHaveLength(3);

    await user.click(within(composer).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("region", { name: "Reply composer" })).not.toBeInTheDocument();
  });

  it("opens reply-all wording for the inline static composer", async () => {
    const user = userEvent.setup();
    renderStaticWorkspace();

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
    expect(
      within(employeeReply).getByRole("button", { name: "Reply" }),
    ).not.toHaveClass("bg-slate-200");
    expect(
      within(employeeReply).getByRole("region", { name: "Reply composer" }),
    ).not.toHaveTextContent(
      "Reply all to N. Ionescu by Razvan Rosca · May 24, 08:22",
    );
  });

  it("keeps ticket sidebar controls synthetic and local", async () => {
    const user = userEvent.setup();
    renderStaticWorkspace();

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
});
