import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  defaultWorkspaceTicketColumns,
  type SelectedTicketUpdatePayload,
  type TicketMetadataMutationActionState,
} from "@/features/tickets";
import { TicketWorkspace } from "@/features/workspace/components/ticket-workspace";
import {
  availableList,
  detailPropsFor,
  noopAction,
  row,
} from "./ticket-workspace-test-utils";

const routerPush = vi.fn();
const routerRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPush,
    refresh: routerRefresh,
  }),
}));

type MutationAction = (
  request: SelectedTicketUpdatePayload,
) => Promise<TicketMetadataMutationActionState>;

describe("TicketWorkspace overdue pending priority updates", () => {
  beforeEach(() => {
    routerPush.mockClear();
    routerRefresh.mockClear();
  });

  it("allows priority-only updates on overdue pending tickets", async () => {
    const user = userEvent.setup();
    const pendingRow = {
      ...row,
      state: "Pending Reminder",
      stateKey: "pending_reminder" as const,
      pendingTill: "Jan 2, 2000",
    };
    const detailProps = detailPropsFor(pendingRow);
    detailProps.detail.pendingUntilIso = "2000-01-02T08:00:00.000Z";
    detailProps.detail.metadataMutationConstraints = {
      pendingDateRequiredStates: {
        pending_reminder: "Zammad pending states require a pending date.",
        pending_close: "Zammad pending states require a pending date.",
      },
    };
    const action = vi.fn<MutationAction>(async () => ({
      status: "saved" as const,
      field: "priority" as const,
      message: "Saved.",
    }));

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
        rows={[pendingRow]}
        selectedTicketId={pendingRow.id}
        setActiveConnectionAction={noopAction}
        tabs={[pendingRow]}
        updateTicketMetadataAction={action}
        userEmail="agent@example.com"
      />,
    );

    await user.click(screen.getByRole("combobox", { name: "Ticket priority" }));
    await user.click(screen.getByRole("option", { name: "High" }));

    expect(screen.getByRole("button", { name: "Update" })).toBeEnabled();
    expect(
      screen.queryByText("Choose a future pending date and time."),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Update" }));

    await waitFor(() => expect(action).toHaveBeenCalledOnce());
    expect(action.mock.calls[0]?.[0]).toEqual({
      metadata: { priority: "high" },
      ticketExternalId: "ticket-1",
    });
  });
});
