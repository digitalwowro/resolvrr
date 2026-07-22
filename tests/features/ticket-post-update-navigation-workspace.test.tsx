import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  defaultWorkspaceTicketColumns,
  type SelectedTicketUpdatePayload,
  type TicketMetadataMutationActionState,
  type WorkspaceTicketRow,
} from "@/features/tickets";
import { TicketWorkspace } from "@/features/workspace/components/ticket-workspace";
import { postUpdateNavigationStorageKey } from "@/features/workspace/components/post-update-navigation";
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

const savedAction = vi.fn<MutationAction>(async () => ({
  status: "saved" as const,
  message: "Saved.",
}));

function renderWorkspace({
  action = savedAction,
  ticket = row,
}: {
  action?: MutationAction;
  ticket?: WorkspaceTicketRow;
} = {}) {
  const detailProps = detailPropsFor(ticket);

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
      rows={[ticket]}
      savedViews={[{ id: "channel", label: "Channel" }]}
      selectedSavedViewId="channel"
      selectedTicketId={ticket.id}
      setActiveConnectionAction={noopAction}
      tabs={[ticket]}
      updateTicketMetadataAction={action}
      userEmail="agent@example.com"
    />,
  );
}

async function stagePriorityChange(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("combobox", { name: "Ticket priority" }));
  await user.click(screen.getByRole("option", { name: "High" }));
}

async function chooseNavigation(
  user: ReturnType<typeof userEvent.setup>,
  label: string,
) {
  await user.click(
    screen.getByRole("combobox", { name: "Post-update navigation" }),
  );
  await user.click(screen.getByRole("option", { name: label }));
}

describe("TicketWorkspace post-update navigation", () => {
  beforeEach(() => {
    window.localStorage.clear();
    savedAction.mockClear();
    routerPush.mockClear();
    routerRefresh.mockClear();
  });

  it("defaults to keeping the ticket open and persists preference changes", async () => {
    const user = userEvent.setup();
    const { unmount } = renderWorkspace();

    expect(
      screen.getByRole("combobox", { name: "Post-update navigation" }),
    ).toHaveTextContent("Keep this tab open");

    await stagePriorityChange(user);
    await chooseNavigation(user, "Close tab if state is Closed");
    expect(window.localStorage.getItem(postUpdateNavigationStorageKey)).toBe(
      "return_to_list_when_closed",
    );

    unmount();
    renderWorkspace();

    expect(
      screen.getByRole("combobox", { name: "Post-update navigation" }),
    ).toHaveTextContent("Close tab if state is Closed");
  });

  it("falls back to keeping the ticket open for invalid stored values", () => {
    window.localStorage.setItem(postUpdateNavigationStorageKey, "zammad-close-tab");
    renderWorkspace();

    expect(
      screen.getByRole("combobox", { name: "Post-update navigation" }),
    ).toHaveTextContent("Keep this tab open");
  });

  it("disables post-update navigation until Update is available", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    expect(
      screen.getByRole("combobox", { name: "Post-update navigation" }),
    ).toBeDisabled();

    await stagePriorityChange(user);

    expect(
      screen.getByRole("combobox", { name: "Post-update navigation" }),
    ).toBeEnabled();
  });

  it("keeps the active ticket open after a successful update by default", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await stagePriorityChange(user);
    await user.click(screen.getByRole("button", { name: "Update" }));

    await waitFor(() => expect(routerRefresh).toHaveBeenCalledOnce());
    expect(routerPush).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Ticket detail #1001")).toBeInTheDocument();
  });

  it("returns to list after a successful update when selected", async () => {
    const user = userEvent.setup();
    const replaceState = vi.spyOn(window.history, "replaceState");
    renderWorkspace();

    await stagePriorityChange(user);
    await chooseNavigation(user, "Close tab & go to List");
    await user.click(screen.getByRole("button", { name: "Update" }));

    await waitFor(() =>
      expect(screen.queryByLabelText("Ticket detail #1001")).not.toBeInTheDocument(),
    );
    expect(routerRefresh).not.toHaveBeenCalled();
    expect(routerPush).not.toHaveBeenCalled();
    expect(replaceState).toHaveBeenLastCalledWith(null, "", "/workspace");
    expect(screen.queryByLabelText("Ticket detail #1001")).not.toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "Return to list: Channel" }),
    ).toHaveAttribute("aria-selected", "true");
  });

  it("returns to list when the final submitted state is closed", async () => {
    const user = userEvent.setup();
    const replaceState = vi.spyOn(window.history, "replaceState");
    renderWorkspace();

    await user.click(screen.getByRole("combobox", { name: "Ticket state" }));
    await user.click(screen.getByRole("option", { name: "Closed" }));
    await chooseNavigation(user, "Close tab if state is Closed");
    await user.click(screen.getByRole("button", { name: "Update" }));

    await waitFor(() =>
      expect(screen.queryByLabelText("Ticket detail #1001")).not.toBeInTheDocument(),
    );
    expect(routerRefresh).not.toHaveBeenCalled();
    expect(routerPush).not.toHaveBeenCalled();
    expect(replaceState).toHaveBeenLastCalledWith(null, "", "/workspace");
    expect(screen.queryByLabelText("Ticket detail #1001")).not.toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "Return to list: Channel" }),
    ).toHaveAttribute("aria-selected", "true");
  });

  it("does not return to list for non-closed final state", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await stagePriorityChange(user);
    await chooseNavigation(user, "Close tab if state is Closed");
    await user.click(screen.getByRole("button", { name: "Update" }));

    await waitFor(() => expect(routerRefresh).toHaveBeenCalledOnce());
    expect(routerPush).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Ticket detail #1001")).toBeInTheDocument();
  });

  it("returns to list for priority-only updates when the final state is already closed", async () => {
    const user = userEvent.setup();
    const replaceState = vi.spyOn(window.history, "replaceState");
    renderWorkspace({
      ticket: { ...row, state: "Closed", stateKey: "closed" },
    });

    await stagePriorityChange(user);
    await chooseNavigation(user, "Close tab if state is Closed");
    await user.click(screen.getByRole("button", { name: "Update" }));

    await waitFor(() =>
      expect(screen.queryByLabelText("Ticket detail #1001")).not.toBeInTheDocument(),
    );
    expect(routerRefresh).not.toHaveBeenCalled();
    expect(routerPush).not.toHaveBeenCalled();
    expect(replaceState).toHaveBeenLastCalledWith(null, "", "/workspace");
  });

  it("does not navigate after failed saves and keeps the draft dirty", async () => {
    const user = userEvent.setup();
    const action = vi.fn<MutationAction>(async () => ({
      status: "failed" as const,
      message: "Save failed.",
    }));
    renderWorkspace({ action });

    await stagePriorityChange(user);
    await chooseNavigation(user, "Close tab & go to List");
    await user.click(screen.getByRole("button", { name: "Update" }));

    expect(await screen.findByText("Save failed.")).toBeInTheDocument();
    expect(routerPush).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Update" })).toBeEnabled();
    expect(screen.getByRole("combobox", { name: "Ticket priority" })).toHaveClass(
      "border-amber-500",
    );
  });

  it("applies navigation after saved-refresh-failed without presenting save failure", async () => {
    const user = userEvent.setup();
    const replaceState = vi.spyOn(window.history, "replaceState");
    const action = vi.fn<MutationAction>(async () => ({
      status: "saved-refresh-failed" as const,
      message:
        "Saved, but the ticket could not be refreshed. Refresh the workspace to verify the latest value.",
    }));
    renderWorkspace({ action });

    await stagePriorityChange(user);
    await chooseNavigation(user, "Close tab & go to List");
    await user.click(screen.getByRole("button", { name: "Update" }));

    await waitFor(() =>
      expect(screen.queryByLabelText("Ticket detail #1001")).not.toBeInTheDocument(),
    );
    expect(routerPush).not.toHaveBeenCalled();
    expect(replaceState).toHaveBeenLastCalledWith(null, "", "/workspace");
    expect(action).toHaveBeenCalledOnce();
    expect(routerRefresh).not.toHaveBeenCalled();
    expect(screen.queryByText("Save failed.")).not.toBeInTheDocument();
  });
});
