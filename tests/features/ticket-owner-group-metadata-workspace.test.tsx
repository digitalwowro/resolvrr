import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  defaultWorkspaceTicketColumns,
  type SelectedTicketUpdatePayload,
  type TicketMetadataMutationActionState,
} from "@/features/tickets";
import { TicketWorkspace } from "@/features/workspace/components/ticket-workspace";
import {
  availableList,
  noopAction,
  row,
  selectedDetailProps,
} from "./ticket-workspace-test-utils";

const routerRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: routerRefresh,
  }),
}));

type MutationAction = (
  request: SelectedTicketUpdatePayload,
) => Promise<TicketMetadataMutationActionState>;

function renderWorkspace(action: MutationAction) {
  const detailProps = selectedDetailProps();

  return render(
    <TicketWorkspace
      columns={defaultWorkspaceTicketColumns}
      connections={[{ id: "connection-1", label: "Support", active: true }]}
      detail={detailProps.detail}
      detailResult={detailProps.detailResult}
      listResult={{
        ...availableList,
        metadataMutationCapabilities: {
          group: true,
          owner: true,
          priority: true,
          state: true,
        },
      }}
      logoutAction={noopAction}
      rows={[row]}
      selectedTicketId="ticket-1"
      setActiveConnectionAction={noopAction}
      tabs={[row]}
      updateTicketMetadataAction={action}
      userEmail="agent@example.com"
    />,
  );
}

describe("TicketWorkspace owner and group metadata updates", () => {
  it("submits staged owner and group changes through the same update action", async () => {
    const user = userEvent.setup();
    const action = vi.fn<MutationAction>(async () => ({
      status: "saved" as const,
      field: "owner" as const,
      message: "Saved.",
    }));
    renderWorkspace(action);

    await user.click(screen.getByRole("combobox", { name: "Ticket owner" }));
    await user.click(screen.getByRole("option", { name: "Priya Agent" }));
    await user.click(screen.getByRole("combobox", { name: "Ticket group" }));
    await user.click(screen.getByRole("option", { name: "Billing" }));

    expect(action).not.toHaveBeenCalled();
    expect(screen.getByRole("combobox", { name: "Ticket owner" })).toHaveClass(
      "border-amber-500",
    );
    expect(screen.getByRole("combobox", { name: "Ticket group" })).toHaveClass(
      "border-amber-500",
    );
    await user.click(screen.getByRole("button", { name: "Update" }));

    await waitFor(() => expect(routerRefresh).toHaveBeenCalledOnce());
    expect(action).toHaveBeenCalledOnce();
    expect(action.mock.calls[0]?.[0]).toEqual({
      metadata: { ownerExternalId: "agent-2", groupExternalId: "group-2" },
      ticketExternalId: "ticket-1",
    });
  });
});
