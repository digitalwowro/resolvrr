import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  defaultWorkspaceTicketColumns,
  type SelectedTicketUpdatePayload,
  type TicketMetadataMutationActionState,
  type WorkspaceTicketRow,
} from "@/features/tickets";
import { TicketWorkspace } from "@/features/workspace/components/ticket-workspace";
import { TicketMetadataEditor } from "@/features/workspace/components/ticket-metadata-editor";
import { pendingDateMonthLabels } from "@/features/workspace/components/ticket-pending-date-time-selector-utils";
import {
  availableList,
  detailPropsFor,
  highRow,
  noopAction,
  noopMutationAction,
  row,
  selectedDetailProps,
} from "./ticket-workspace-test-utils";

const routerPush = vi.fn();
const routerRefresh = vi.fn();

function pendingDateButtonName(dayOffset: number) {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  return `Select ${pendingDateMonthLabels[date.getMonth()]} ${date.getDate()}`;
}

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPush,
    refresh: routerRefresh,
  }),
}));

type MutationAction = (
  request: SelectedTicketUpdatePayload,
) => Promise<TicketMetadataMutationActionState>;

function renderWorkspace({
  action = noopMutationAction,
  detailProps = selectedDetailProps(),
  rows = [row],
  selectedTicketId = "ticket-1",
}: {
  action?: MutationAction;
  detailProps?: ReturnType<typeof selectedDetailProps>;
  rows?: WorkspaceTicketRow[];
  selectedTicketId?: string;
} = {}) {
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
      rows={rows}
      selectedTicketId={selectedTicketId}
      setActiveConnectionAction={noopAction}
      tabs={rows}
      updateTicketMetadataAction={action}
      userEmail="agent@example.com"
    />,
  );
}

describe("TicketWorkspace staged metadata updates", () => {
  beforeEach(() => {
    routerPush.mockClear();
    routerRefresh.mockClear();
  });

  it("submits staged state and priority changes as one action", async () => {
    const user = userEvent.setup();
    const action = vi.fn<MutationAction>(async () => ({
      status: "saved" as const,
      field: "state" as const,
      message: "Saved.",
    }));
    renderWorkspace({ action });

    await user.click(screen.getByRole("combobox", { name: "Ticket state" }));
    await user.click(screen.getByRole("option", { name: "Closed" }));
    await user.click(screen.getByRole("combobox", { name: "Ticket priority" }));
    await user.click(screen.getByRole("option", { name: "High" }));

    expect(action).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Update" }));

    await waitFor(() => expect(routerRefresh).toHaveBeenCalledOnce());
    expect(action).toHaveBeenCalledOnce();
    expect(action.mock.calls[0]?.[0]).toEqual({
      metadata: { priority: "high", state: "closed" },
      ticketExternalId: "ticket-1",
    });
  });

  it("does not show visible saving metadata copy while Update is pending", async () => {
    const user = userEvent.setup();
    let resolveAction: ((value: TicketMetadataMutationActionState) => void) | undefined;
    const action = vi.fn<MutationAction>(
      () =>
        new Promise((resolve) => {
          resolveAction = resolve;
        }),
    );
    renderWorkspace({ action });

    await user.click(screen.getByRole("combobox", { name: "Ticket priority" }));
    await user.click(screen.getByRole("option", { name: "High" }));
    await user.click(screen.getByRole("button", { name: "Update" }));

    expect(action).toHaveBeenCalledOnce();
    expect(screen.queryByText("Saving metadata...")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Update" })).toBeDisabled();

    resolveAction?.({
      status: "saved",
      field: "priority",
      message: "Saved.",
    });
    await waitFor(() => expect(routerRefresh).toHaveBeenCalledOnce());
  });

  it("marks changed fields and clears them with Discard changes", async () => {
    const user = userEvent.setup();
    const action = vi.fn<MutationAction>(noopMutationAction);
    renderWorkspace({ action });

    await user.click(screen.getByRole("combobox", { name: "Ticket priority" }));
    await user.click(screen.getByRole("option", { name: "High" }));

    expect(action).not.toHaveBeenCalled();
    expect(screen.getByRole("combobox", { name: "Ticket priority" })).toHaveClass(
      "border-amber-500",
    );
    const actionBar = screen.getByRole("group", {
      name: "Staged metadata actions",
    });
    const actionButtons = within(actionBar).getAllByRole("button");
    expect(actionButtons.map((button) => button.textContent)).toEqual([
      "Discard changes",
      "Update",
    ]);
    expect(actionBar).toHaveClass("sticky", "bottom-0");
    await user.click(screen.getByRole("button", { name: "Discard changes" }));

    expect(action).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Update" })).toBeDisabled(),
    );
    expect(screen.getByRole("button", { name: "Discard changes" })).toBeDisabled();
    expect(screen.getByRole("combobox", { name: "Ticket priority" })).toHaveTextContent(
      "Medium",
    );
    expect(
      screen.getByRole("combobox", { name: "Ticket priority" }),
    ).not.toHaveClass("border-amber-500");
  });

  it("disables actions when staged values are manually reverted", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByRole("combobox", { name: "Ticket state" }));
    await user.click(screen.getByRole("option", { name: "Closed" }));
    expect(screen.getByRole("button", { name: "Update" })).toBeEnabled();
    await user.click(screen.getByRole("combobox", { name: "Ticket state" }));
    await user.click(screen.getByRole("option", { name: "Open" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Update" })).toBeDisabled(),
    );
    expect(screen.getByRole("button", { name: "Discard changes" })).toBeDisabled();
  });

  it("keeps staged values when switching tab orientation", async () => {
    const user = userEvent.setup();
    const action = vi.fn<MutationAction>(noopMutationAction);
    renderWorkspace({ action });

    await user.click(screen.getByRole("combobox", { name: "Ticket state" }));
    await user.click(screen.getByRole("option", { name: "Closed" }));
    await user.click(screen.getByRole("button", { name: "Vertical tabs" }));

    expect(action).not.toHaveBeenCalled();
    expect(screen.getByRole("combobox", { name: "Ticket state" })).toHaveTextContent(
      "Closed",
    );
    expect(screen.getByRole("button", { name: "Update" })).toBeEnabled();
  });

  it("does not allow selecting past pending dates", async () => {
    const user = userEvent.setup();
    const detailProps = selectedDetailProps();
    detailProps.detail.metadataMutationConstraints = {
      pendingDateRequiredStates: {
        pending_reminder: "Zammad pending states require a pending date.",
      },
    };
    renderWorkspace({ detailProps });

    await user.click(screen.getByRole("combobox", { name: "Ticket state" }));
    await user.click(screen.getByRole("option", { name: "Pending Reminder" }));
    await user.click(
      screen.getByRole("button", {
        name: /Open pending date and time selector for Pending Reminder/,
      }),
    );

    expect(
      screen.getByRole("button", { name: pendingDateButtonName(-1) }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: pendingDateButtonName(-2) }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: pendingDateButtonName(1) }),
    ).toBeEnabled();
    expect(
      screen.queryByRole("button", { name: "Select minute 04" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Select minute 05" }),
    ).toBeInTheDocument();
  });

  it("rebases staged values when the selected ticket changes", async () => {
    const user = userEvent.setup();
    const detailProps = selectedDetailProps();
    const { rerender } = render(
      <TicketMetadataEditor
        detail={detailProps.detail}
        metadataMutationCapabilities={{ state: true, priority: true }}
        onMetadataSaved={vi.fn()}
        onReturnToListAfterUpdate={vi.fn()}
        updateTicketMetadataAction={noopMutationAction}
      />,
    );

    await user.click(screen.getByRole("combobox", { name: "Ticket state" }));
    await user.click(screen.getByRole("option", { name: "Closed" }));
    expect(screen.getByRole("button", { name: "Update" })).toBeEnabled();

    const nextDetailProps = detailPropsFor(highRow);
    rerender(
      <TicketMetadataEditor
        detail={nextDetailProps.detail}
        metadataMutationCapabilities={{ state: true, priority: true }}
        onMetadataSaved={vi.fn()}
        onReturnToListAfterUpdate={vi.fn()}
        updateTicketMetadataAction={noopMutationAction}
      />,
    );

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Update" })).toBeDisabled(),
    );
    expect(screen.getByRole("combobox", { name: "Ticket state" })).toHaveTextContent(
      "Open",
    );
    expect(screen.getByRole("combobox", { name: "Ticket priority" })).toHaveTextContent(
      "High",
    );
  });

});
