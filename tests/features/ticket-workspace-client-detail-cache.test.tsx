import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  defaultWorkspaceTicketColumns,
  type TicketMetadataMutationActionState,
  type WorkspaceTicketDetailLoadResult,
} from "@/features/tickets";
import { TicketWorkspace } from "@/features/workspace/components/ticket-workspace";
import {
  availableList,
  detailPropsFor,
  highRow,
  noopAction,
  row,
} from "./ticket-workspace-test-utils";

const routerPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPush,
    refresh: vi.fn(),
  }),
}));

type MutationAction = (
  formData: FormData,
) => Promise<TicketMetadataMutationActionState>;

describe("TicketWorkspace client detail cache", () => {
  beforeEach(() => {
    routerPush.mockClear();
    window.history.replaceState(null, "", "/workspace");
  });

  it("refreshes the initial selected ticket cache after a saved metadata update", async () => {
    const user = userEvent.setup();
    const initialDetail = detailPropsFor(row, "Initial ticket thread");
    const refreshedDetail = detailPropsFor(
      {
        ...row,
        priority: "High",
        priorityKey: "high",
        updatedAt: "May 24, 09:15",
      },
      "Refreshed ticket thread",
    );
    const loadTicketDetailAction = vi.fn(async () => refreshedDetail.detailResult);
    const updateTicketMetadataAction = vi.fn<MutationAction>(async () => ({
      status: "saved",
      field: "priority",
      message: "Saved.",
    }));

    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        detail={initialDetail.detail}
        detailResult={initialDetail.detailResult}
        listResult={{
          ...availableList,
          metadataMutationCapabilities: { state: true, priority: true },
        }}
        loadTicketDetailAction={loadTicketDetailAction}
        logoutAction={noopAction}
        rows={[row]}
        selectedTicketId="ticket-1"
        setActiveConnectionAction={noopAction}
        tabs={[{ ...row }]}
        updateTicketMetadataAction={updateTicketMetadataAction}
        userEmail="agent@example.com"
      />,
    );

    expect(screen.getByText("Initial ticket thread")).toBeInTheDocument();

    await user.click(screen.getByRole("combobox", { name: "Ticket priority" }));
    await user.click(screen.getByRole("option", { name: "High" }));
    await user.click(screen.getByRole("button", { name: "Update" }));

    expect(await screen.findByText("Refreshed ticket thread")).toBeInTheDocument();
    expect(screen.queryByText("Initial ticket thread")).toBeNull();
    expect(loadTicketDetailAction).toHaveBeenCalledOnce();
    expect(loadTicketDetailAction).toHaveBeenCalledWith("ticket-1");
  });

  it("reuses refreshed cached detail when switching back to an open ticket", async () => {
    const user = userEvent.setup();
    const initialDetail = detailPropsFor(highRow, "Original loaded thread");
    const refreshedDetail = detailPropsFor(
      {
        ...highRow,
        priority: "Low",
        priorityKey: "low",
        updatedAt: "May 24, 10:00",
      },
      "Refreshed cached thread",
    );
    const loadTicketDetailAction = vi
      .fn<() => Promise<WorkspaceTicketDetailLoadResult>>()
      .mockResolvedValueOnce(initialDetail.detailResult)
      .mockResolvedValueOnce(refreshedDetail.detailResult);
    const updateTicketMetadataAction = vi.fn<MutationAction>(async () => ({
      status: "saved",
      field: "priority",
      message: "Saved.",
    }));

    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        listResult={{
          ...availableList,
          metadataMutationCapabilities: { state: true, priority: true },
        }}
        loadTicketDetailAction={loadTicketDetailAction}
        logoutAction={noopAction}
        rows={[row, highRow]}
        setActiveConnectionAction={noopAction}
        tabs={[{ ...row }, { ...highRow }]}
        updateTicketMetadataAction={updateTicketMetadataAction}
        userEmail="agent@example.com"
      />,
    );

    await user.click(screen.getByRole("row", { name: /Webhook failed/u }));
    expect(await screen.findByText("Original loaded thread")).toBeInTheDocument();

    await user.click(screen.getByRole("combobox", { name: "Ticket priority" }));
    await user.click(screen.getByRole("option", { name: "Low" }));
    await user.click(screen.getByRole("button", { name: "Update" }));

    expect(await screen.findByText("Refreshed cached thread")).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "Return to list: All tickets" }));
    await user.click(screen.getByRole("tab", { name: /#1002/u }));

    expect(screen.getByText("Refreshed cached thread")).toBeInTheDocument();
    expect(loadTicketDetailAction).toHaveBeenCalledTimes(2);
  });
});
