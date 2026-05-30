import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  defaultWorkspaceTicketColumns,
  type TicketCustomerReplyActionState,
  type TicketCustomerReplyPayload,
  type TicketInternalNoteActionState,
  type TicketInternalNotePayload,
} from "@/features/tickets";
import { TicketWorkspace } from "@/features/workspace/components/ticket-workspace";
import {
  availableList,
  detailPropsFor,
  noopAction,
  noopMutationAction,
  row,
  selectedDetailProps,
} from "./ticket-workspace-test-utils";

const routerPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPush,
    refresh: vi.fn(),
  }),
}));

type InternalNoteAction = (
  request: TicketInternalNotePayload,
) => Promise<TicketInternalNoteActionState>;

type CustomerReplyAction = (
  request: TicketCustomerReplyPayload,
) => Promise<TicketCustomerReplyActionState>;

describe("TicketWorkspace internal notes", () => {
  beforeEach(() => {
    routerPush.mockClear();
  });

  it("submits an internal note explicitly and refreshes the selected detail", async () => {
    const user = userEvent.setup();
    const initialDetail = selectedDetailProps();
    const refreshedDetail = detailPropsFor(row, "Checked the logs.");
    const addTicketInternalNoteAction = vi.fn<InternalNoteAction>(async () => ({
      status: "saved",
      message: "Note added.",
    }));
    const loadTicketDetailAction = vi.fn(async () => refreshedDetail.detailResult);

    render(
      <TicketWorkspace
        addTicketInternalNoteAction={addTicketInternalNoteAction}
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        detail={initialDetail.detail}
        detailResult={initialDetail.detailResult}
        listResult={{
          ...availableList,
          communicationCapabilities: { customerReplies: false, internalNotes: true },
        }}
        loadTicketDetailAction={loadTicketDetailAction}
        logoutAction={noopAction}
        rows={[row]}
        selectedTicketId="ticket-1"
        setActiveConnectionAction={noopAction}
        tabs={[{ ...row }]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="agent@example.com"
      />,
    );

    await user.type(screen.getByLabelText("Internal note"), "Checked the logs.");
    await user.click(screen.getByRole("button", { name: "Add note" }));

    expect(addTicketInternalNoteAction).toHaveBeenCalledWith({
      body: "Checked the logs.",
      ticketExternalId: "ticket-1",
    });
    expect(await screen.findByText("Checked the logs.")).toBeInTheDocument();
    expect(loadTicketDetailAction).toHaveBeenCalledWith("ticket-1");
    expect(screen.getByLabelText("Internal note")).toHaveValue("");
  });

  it("shows provider failures without clearing the note draft", async () => {
    const user = userEvent.setup();
    const detailProps = selectedDetailProps();
    const addTicketInternalNoteAction = vi.fn<InternalNoteAction>(async () => ({
      status: "failed",
      message: "The helpdesk could not be reached. Try again.",
    }));

    render(
      <TicketWorkspace
        addTicketInternalNoteAction={addTicketInternalNoteAction}
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        detail={detailProps.detail}
        detailResult={detailProps.detailResult}
        listResult={{
          ...availableList,
          communicationCapabilities: { customerReplies: false, internalNotes: true },
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

    await user.type(screen.getByLabelText("Internal note"), "Checked the logs.");
    await user.click(screen.getByRole("button", { name: "Add note" }));

    expect(
      await screen.findByText("The helpdesk could not be reached. Try again."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Internal note")).toHaveValue("Checked the logs.");
  });

  it("clears the draft and shows a refresh warning for saved-refresh-failed", async () => {
    const user = userEvent.setup();
    const detailProps = selectedDetailProps();
    const addTicketInternalNoteAction = vi.fn<InternalNoteAction>(async () => ({
      status: "saved-refresh-failed",
      message:
        "Note added, but the ticket could not be refreshed. Refresh the workspace to verify the latest thread.",
    }));
    const loadTicketDetailAction = vi.fn(async () => detailProps.detailResult);

    render(
      <TicketWorkspace
        addTicketInternalNoteAction={addTicketInternalNoteAction}
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        detail={detailProps.detail}
        detailResult={detailProps.detailResult}
        listResult={{
          ...availableList,
          communicationCapabilities: { customerReplies: false, internalNotes: true },
        }}
        loadTicketDetailAction={loadTicketDetailAction}
        logoutAction={noopAction}
        rows={[row]}
        selectedTicketId="ticket-1"
        setActiveConnectionAction={noopAction}
        tabs={[{ ...row }]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="agent@example.com"
      />,
    );

    await user.type(screen.getByLabelText("Internal note"), "Checked the logs.");
    await user.click(screen.getByRole("button", { name: "Add note" }));

    expect(
      await screen.findByText(
        "Note added, but the ticket could not be refreshed. Refresh the workspace to verify the latest thread.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Internal note")).toHaveValue("");
    expect(loadTicketDetailAction).not.toHaveBeenCalled();
  });
});

describe("TicketWorkspace customer replies", () => {
  beforeEach(() => {
    routerPush.mockClear();
  });

  it("submits a customer reply explicitly and refreshes the selected detail", async () => {
    const user = userEvent.setup();
    const initialDetail = selectedDetailProps();
    const refreshedDetail = detailPropsFor(row, "Thanks for the report.");
    const addTicketCustomerReplyAction = vi.fn<CustomerReplyAction>(async () => ({
      status: "saved",
      message: "Reply sent.",
    }));
    const loadTicketDetailAction = vi.fn(async () => refreshedDetail.detailResult);

    render(
      <TicketWorkspace
        addTicketCustomerReplyAction={addTicketCustomerReplyAction}
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        detail={initialDetail.detail}
        detailResult={initialDetail.detailResult}
        listResult={{
          ...availableList,
          communicationCapabilities: { customerReplies: true, internalNotes: false },
        }}
        loadTicketDetailAction={loadTicketDetailAction}
        logoutAction={noopAction}
        rows={[row]}
        selectedTicketId="ticket-1"
        setActiveConnectionAction={noopAction}
        tabs={[{ ...row }]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="agent@example.com"
      />,
    );

    await user.type(
      screen.getByLabelText("Customer reply"),
      "Thanks for the report.",
    );
    await user.click(screen.getByRole("button", { name: "Send reply" }));

    expect(addTicketCustomerReplyAction).toHaveBeenCalledWith({
      body: "Thanks for the report.",
      ticketExternalId: "ticket-1",
    });
    expect(await screen.findByText("Thanks for the report.")).toBeInTheDocument();
    expect(loadTicketDetailAction).toHaveBeenCalledWith("ticket-1");
    expect(screen.getByLabelText("Customer reply")).toHaveValue("");
  });

  it("clears the reply draft and shows a refresh warning for saved-refresh-failed", async () => {
    const user = userEvent.setup();
    const detailProps = selectedDetailProps();
    const addTicketCustomerReplyAction = vi.fn<CustomerReplyAction>(async () => ({
      status: "saved-refresh-failed",
      message:
        "Reply sent, but the ticket could not be refreshed. Refresh the workspace to verify the latest thread.",
    }));
    const loadTicketDetailAction = vi.fn(async () => detailProps.detailResult);

    render(
      <TicketWorkspace
        addTicketCustomerReplyAction={addTicketCustomerReplyAction}
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        detail={detailProps.detail}
        detailResult={detailProps.detailResult}
        listResult={{
          ...availableList,
          communicationCapabilities: { customerReplies: true, internalNotes: false },
        }}
        loadTicketDetailAction={loadTicketDetailAction}
        logoutAction={noopAction}
        rows={[row]}
        selectedTicketId="ticket-1"
        setActiveConnectionAction={noopAction}
        tabs={[{ ...row }]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="agent@example.com"
      />,
    );

    await user.type(
      screen.getByLabelText("Customer reply"),
      "Thanks for the report.",
    );
    await user.click(screen.getByRole("button", { name: "Send reply" }));

    expect(
      await screen.findByText(
        "Reply sent, but the ticket could not be refreshed. Refresh the workspace to verify the latest thread.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Customer reply")).toHaveValue("");
    expect(loadTicketDetailAction).not.toHaveBeenCalled();
  });
});
