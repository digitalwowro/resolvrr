import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TicketWorkspace } from "@/features/workspace/components/ticket-workspace";
import { defaultWorkspaceTicketColumns } from "@/features/tickets";
import {
  availableList,
  noopAction,
  noopMutationAction,
  row,
  selectedDetailProps,
} from "./ticket-workspace-test-utils";
import type { ConnectionProviderOption } from "@/features/helpdesk-connections";

const routerPush = vi.fn();
const routerRefresh = vi.fn();

const providerOptions: ConnectionProviderOption[] = [
  {
    key: "example",
    label: "Example",
    credentialSchemes: [
      {
        key: "basic-auth",
        label: "Basic Auth",
        fields: [
          { name: "username", label: "Username", type: "text", required: true },
          {
            name: "password",
            label: "Password",
            type: "password",
            required: true,
          },
        ],
      },
    ],
  },
];

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPush,
    refresh: routerRefresh,
  }),
}));


describe("TicketWorkspace", () => {
  beforeEach(() => {
    routerPush.mockClear();
    routerRefresh.mockClear();
  });

  it("renders a first-workspace prompt without leaving the workspace", async () => {
    const user = userEvent.setup();
    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connectionProviderOptions={providerOptions}
        connections={[]}
        listResult={{
          status: "unavailable",
          reason: "no-active-connection",
          retryable: false,
        }}
        logoutAction={noopAction}
        rows={[]}
        setActiveConnectionAction={noopAction}
        tabs={[]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="agent@example.com"
      />,
    );

    expect(screen.getByText("Tickets unavailable")).toBeInTheDocument();
    expect(
      screen.getByText(/Create your first workspace by clicking/u),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Open profile menu, workspace" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "here" }));

    const dialog = screen.getByRole("dialog", { name: "Settings" });
    expect(within(dialog).getByRole("button", { name: "Workspaces" })).toHaveClass(
      "bg-indigo-50",
    );
    expect(within(dialog).getByText("No workspaces connected")).toBeInTheDocument();
  });

  it("renders provider-backed rows with the production table shell", () => {
    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        listResult={availableList}
        logoutAction={noopAction}
        rows={[row]}
        setActiveConnectionAction={noopAction}
        tabs={[{ ...row }]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="agent@example.com"
      />,
    );

    const table = screen.getByRole("table", { name: "Tickets" });
    expect(within(table).getByText("#1001")).toBeInTheDocument();
    expect(within(table).getByText("Cannot log in")).toBeInTheDocument();
    expect(within(table).getByText("Maya Patel")).toBeInTheDocument();
    expect(screen.queryByText("Billing follow-up for annual renewal")).toBeNull();
  });

  it("renders the real workspace profile menu actions", async () => {
    const user = userEvent.setup();
    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        listResult={availableList}
        logoutAction={noopAction}
        rows={[row]}
        setActiveConnectionAction={noopAction}
        tabs={[{ ...row }]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="agent@example.com"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Open profile menu, Support" }));

    const trigger = screen.getByRole("button", {
      name: "Open profile menu, Support",
    });

    expect(screen.getByRole("menuitem", { name: /Support/u })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Log out" })).toBeInTheDocument();
    await user.click(screen.getByRole("menuitem", { name: "Settings" }));
    expect(screen.getByRole("dialog", { name: "Settings" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Close settings" }));
    expect(trigger).toHaveFocus();
    expect(screen.queryByRole("menuitem", { name: "Preferences" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("menuitem", { name: "Keyboard shortcuts" }),
    ).not.toBeInTheDocument();
  });

  it("keeps metadata read-only when mutation capabilities are unavailable", () => {
    const detailProps = selectedDetailProps();

    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        detail={detailProps.detail}
        detailResult={detailProps.detailResult}
        listResult={availableList}
        logoutAction={noopAction}
        rows={[row]}
        selectedTicketId="ticket-1"
        setActiveConnectionAction={noopAction}
        tabs={[{ ...row }]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="agent@example.com"
      />,
    );

    expect(screen.queryByRole("combobox", { name: "Ticket state" })).toBeNull();
    expect(screen.queryByRole("combobox", { name: "Ticket priority" })).toBeNull();
    expect(screen.getAllByText("Open").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Medium").length).toBeGreaterThan(0);
  });

  it("disables list controls only while a ticket pane is active", async () => {
    const user = userEvent.setup();
    const detailProps = selectedDetailProps();
    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        detail={detailProps.detail}
        detailResult={detailProps.detailResult}
        listResult={availableList}
        logoutAction={noopAction}
        rows={[row]}
        selectedTicketId="ticket-1"
        setActiveConnectionAction={noopAction}
        tabs={[{ ...row }]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="agent@example.com"
      />,
    );

    expect(
      screen.queryByRole("checkbox", { name: "Select all tickets" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Refresh list" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("combobox", { name: "Saved view" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("combobox", { name: "Group tickets by" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Column visibility" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("toolbar", { name: "Ticket list controls" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText("System status")).not.toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Tab layout" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Horizontal tabs" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Vertical tabs" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Horizontal tabs" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const tablist = screen.getByRole("tablist", { name: "Open tickets" });
    expect(within(tablist).getAllByRole("tab")[0]).toHaveAccessibleName(
      "Return to list: All tickets",
    );

    await user.click(screen.getByRole("tab", { name: "Return to list: All tickets" }));

    expect(screen.getByRole("table", { name: "Tickets" })).toBeInTheDocument();
    expect(
      screen.getByRole("toolbar", { name: "Ticket list controls" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Select all tickets" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Refresh list" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Bulk actions" })).toBeDisabled();
    expect(screen.getByRole("combobox", { name: "Saved view" })).toBeEnabled();
    expect(screen.getByRole("combobox", { name: "Group tickets by" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Column visibility" })).toBeEnabled();
  });
});
