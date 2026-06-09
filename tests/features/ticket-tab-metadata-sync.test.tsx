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
  noopAction,
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
}

function activeTicketTabBottomAccent() {
  const tab = screen.getByRole("tab", { name: "#1001 Cannot log in" });
  const accent = tab.parentElement?.querySelector('span[aria-hidden="true"]');
  expect(accent).toBeInstanceOf(HTMLElement);
  return accent as HTMLElement;
}

describe("Ticket tab metadata sync", () => {
  beforeEach(() => {
    routerPush.mockClear();
    routerRefresh.mockClear();
  });

  it("updates the active tab bottom accent color after a saved state change", async () => {
    const user = userEvent.setup();
    const action = vi.fn<MutationAction>(async () => ({
      status: "saved" as const,
      field: "state" as const,
      message: "Saved.",
    }));
    renderWorkspace(action);

    expect(activeTicketTabBottomAccent()).toHaveClass("text-indigo-600");

    await user.click(screen.getByRole("combobox", { name: "Ticket state" }));
    await user.click(screen.getByRole("option", { name: "Closed" }));
    await user.click(screen.getByRole("button", { name: "Update" }));

    await waitFor(() => expect(action).toHaveBeenCalledOnce());
    expect(activeTicketTabBottomAccent()).toHaveClass("text-emerald-600");
  });
});
