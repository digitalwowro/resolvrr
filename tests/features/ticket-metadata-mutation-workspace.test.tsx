import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  defaultWorkspaceTicketColumns,
} from "@/features/tickets";
import { TicketWorkspace } from "@/features/workspace/components/ticket-workspace";
import {
  availableList,
  noopAction,
  noopMutationAction,
  row,
  selectedDetailProps,
} from "./ticket-workspace-test-utils";

const routerPush = vi.fn();
const routerRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPush,
    refresh: routerRefresh,
  }),
}));

describe("TicketWorkspace metadata mutations", () => {
  beforeEach(() => {
    routerPush.mockClear();
    routerRefresh.mockClear();
  });

  it("submits state mutations and refreshes the workspace after save", async () => {
    const user = userEvent.setup();
    const detailProps = selectedDetailProps();
    const action = vi.fn(async (formData: FormData) => {
      void formData;
      return {
        status: "saved" as const,
        field: "state" as const,
        message: "Saved.",
      };
    });

    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        detail={detailProps.detail}
        detailResult={detailProps.detailResult}
        listResult={{
          ...availableList,
          metadataMutationCapabilities: { state: true, priority: true },
        }}
        logoutAction={noopAction}
        rows={[row]}
        selectedTicketId="ticket-1"
        setActiveConnectionAction={noopAction}
        tabs={[{ ...row }]}
        updateTicketMetadataAction={action}
        userEmail="agent@example.com"
      />,
    );

    await user.click(screen.getByRole("combobox", { name: "Ticket state" }));
    await user.click(screen.getByRole("option", { name: "Closed" }));

    await waitFor(() => expect(routerRefresh).toHaveBeenCalledOnce());
    const formData = action.mock.calls[0]?.[0] as FormData;
    expect(formData.get("ticketExternalId")).toBe("ticket-1");
    expect(formData.get("field")).toBe("state");
    expect(formData.get("value")).toBe("closed");
  });

  it("hides provider-supplied unavailable state options", async () => {
    const user = userEvent.setup();
    const detailProps = selectedDetailProps();
    detailProps.detail.metadataMutationConstraints = {
      hiddenStates: ["new"],
      pendingDateRequiredStates: {
        pending_reminder: "Zammad pending states require a pending date.",
        pending_close: "Zammad pending states require a pending date.",
      },
    };

    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        detail={detailProps.detail}
        detailResult={detailProps.detailResult}
        listResult={{
          ...availableList,
          metadataMutationCapabilities: { state: true, priority: true },
        }}
        logoutAction={noopAction}
        rows={[row]}
        selectedTicketId="ticket-1"
        setActiveConnectionAction={noopAction}
        tabs={[{ ...row }]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="agent@example.com"
      />,
    );

    await user.click(screen.getByRole("combobox", { name: "Ticket state" }));

    expect(
      screen.queryByRole("option", { name: "New" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Pending Reminder" })).toBeEnabled();
    expect(screen.getByRole("option", { name: "Pending Close" })).toBeEnabled();
    expect(screen.getByRole("option", { name: "Open" })).toBeEnabled();
  });

  it("shows current new state while omitting new from the menu", async () => {
    const user = userEvent.setup();
    const detailProps = selectedDetailProps();
    detailProps.detail.state = "New";
    detailProps.detail.stateKey = "new";
    detailProps.detail.metadataMutationConstraints = {
      hiddenStates: ["new"],
    };

    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        detail={detailProps.detail}
        detailResult={detailProps.detailResult}
        listResult={{
          ...availableList,
          metadataMutationCapabilities: { state: true, priority: true },
        }}
        logoutAction={noopAction}
        rows={[row]}
        selectedTicketId="ticket-1"
        setActiveConnectionAction={noopAction}
        tabs={[{ ...row }]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="agent@example.com"
      />,
    );

    expect(screen.getByRole("combobox", { name: "Ticket state" })).toHaveTextContent(
      "New",
    );
    await user.click(screen.getByRole("combobox", { name: "Ticket state" }));

    expect(
      screen.queryByRole("option", { name: "New" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Open" })).toBeEnabled();
    expect(screen.getByRole("option", { name: "Pending Reminder" })).toBeEnabled();
  });

  it("submits pending state mutations with a future pending date", async () => {
    const user = userEvent.setup();
    const detailProps = selectedDetailProps();
    detailProps.detail.metadataMutationConstraints = {
      pendingDateRequiredStates: {
        pending_reminder: "Zammad pending states require a pending date.",
        pending_close: "Zammad pending states require a pending date.",
      },
    };
    const action = vi.fn(async (formData: FormData) => {
      void formData;
      return {
        status: "saved" as const,
        field: "state" as const,
        message: "Saved.",
      };
    });

    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        detail={detailProps.detail}
        detailResult={detailProps.detailResult}
        listResult={{
          ...availableList,
          metadataMutationCapabilities: { state: true, priority: true },
        }}
        logoutAction={noopAction}
        rows={[row]}
        selectedTicketId="ticket-1"
        setActiveConnectionAction={noopAction}
        tabs={[{ ...row }]}
        updateTicketMetadataAction={action}
        userEmail="agent@example.com"
      />,
    );

    await user.click(screen.getByRole("combobox", { name: "Ticket state" }));
    await user.click(screen.getByRole("option", { name: "Pending Reminder" }));
    expect(screen.getByRole("combobox", { name: "Ticket state" })).toHaveTextContent(
      "Pending Reminder",
    );
    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Cancel" }),
    ).not.toBeInTheDocument();
    const pendingDateInput = screen.getByLabelText(
      "Pending date for Pending Reminder",
    );
    const pendingTimeInput = screen.getByLabelText(
      "Pending time for Pending Reminder",
    );
    expect(pendingTimeInput).toHaveValue("08:00");
    expect(action).not.toHaveBeenCalled();
    fireEvent.change(pendingDateInput, { target: { value: "2099-01-02" } });

    await waitFor(() => expect(routerRefresh).toHaveBeenCalledOnce());
    const formData = action.mock.calls[0]?.[0] as FormData;
    expect(formData.get("field")).toBe("state");
    expect(formData.get("value")).toBe("pending_reminder");
    expect(new Date(String(formData.get("pendingUntil"))).toISOString()).toBe(
      new Date("2099-01-02T08:00").toISOString(),
    );
  });

  it("shows mutation errors without optimistic metadata changes", async () => {
    const user = userEvent.setup();
    const detailProps = selectedDetailProps();
    const action = vi.fn(async (formData: FormData) => {
      void formData;
      return {
        status: "failed" as const,
        field: "priority" as const,
        message:
          "The helpdesk account does not have permission to update this ticket.",
      };
    });

    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        detail={detailProps.detail}
        detailResult={detailProps.detailResult}
        listResult={{
          ...availableList,
          metadataMutationCapabilities: { state: true, priority: true },
        }}
        logoutAction={noopAction}
        rows={[row]}
        selectedTicketId="ticket-1"
        setActiveConnectionAction={noopAction}
        tabs={[{ ...row }]}
        updateTicketMetadataAction={action}
        userEmail="agent@example.com"
      />,
    );

    await user.click(screen.getByRole("combobox", { name: "Ticket priority" }));
    await user.click(screen.getByRole("option", { name: "High" }));

    expect(
      await screen.findByText(
        "The helpdesk account does not have permission to update this ticket.",
      ),
    ).toBeInTheDocument();
    expect(routerRefresh).not.toHaveBeenCalled();
    expect(screen.getByRole("combobox", { name: "Ticket priority" })).toHaveTextContent(
      "Medium",
    );
  });
});
