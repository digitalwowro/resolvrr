import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  defaultWorkspaceTicketColumns,
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
          communicationCapabilities: { internalNotes: true },
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
          communicationCapabilities: { internalNotes: true },
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
});
