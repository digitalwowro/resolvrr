import { render, screen } from "@testing-library/react";
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

type MutationAction = (
  request: SelectedTicketUpdatePayload,
) => Promise<TicketMetadataMutationActionState>;

function renderReadOnlyWorkspace() {
  const detailProps = selectedDetailProps();
  return render(
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
      tabs={[row]}
      updateTicketMetadataAction={noopMutationAction}
      userEmail="agent@example.com"
    />,
  );
}

describe("TicketWorkspace staged metadata edge cases", () => {
  beforeEach(() => {
    routerPush.mockClear();
    routerRefresh.mockClear();
  });

  it("treats saved-refresh-failed as saved locally, not as save failure", async () => {
    const user = userEvent.setup();
    const detailProps = selectedDetailProps();
    const action = vi.fn<MutationAction>(async () => ({
      status: "saved-refresh-failed" as const,
      field: "priority" as const,
      message:
        "Saved, but the ticket could not be refreshed. Refresh the workspace to verify the latest value.",
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
        rows={[row]}
        selectedTicketId="ticket-1"
        setActiveConnectionAction={noopAction}
        tabs={[row]}
        updateTicketMetadataAction={action}
        userEmail="agent@example.com"
      />,
    );

    await user.click(screen.getByRole("combobox", { name: "Ticket priority" }));
    await user.click(screen.getByRole("option", { name: "High" }));
    await user.click(screen.getByRole("button", { name: "Update" }));

    expect(
      await screen.findByText(
        "Saved, but the ticket could not be refreshed. Refresh the workspace to verify the latest value.",
      ),
    ).toBeInTheDocument();
    expect(routerRefresh).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Update" })).toBeDisabled();
    expect(screen.getByRole("combobox", { name: "Ticket priority" })).toHaveTextContent(
      "High",
    );
  });

  it("keeps metadata read-only when mutation capabilities are unavailable", () => {
    renderReadOnlyWorkspace();

    expect(
      screen.queryByRole("combobox", { name: "Ticket state" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("combobox", { name: "Ticket priority" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Update" })).toBeDisabled();
    expect(screen.getAllByText("Open").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Medium").length).toBeGreaterThan(0);
  });
});
