import { render, screen, waitFor } from "@testing-library/react";
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

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((innerResolve) => {
    resolve = innerResolve;
  });
  return { promise, resolve };
}

type MutationAction = (
  formData: FormData,
) => Promise<TicketMetadataMutationActionState>;

describe("TicketWorkspace client detail loader", () => {
  beforeEach(() => {
    routerPush.mockClear();
    window.history.replaceState(null, "", "/workspace");
  });

  it("opens a row locally with replaceState and loads detail without router navigation", async () => {
    const user = userEvent.setup();
    const loadTicketDetailAction = vi.fn(
      () => new Promise<WorkspaceTicketDetailLoadResult>(() => undefined),
    );
    const replaceState = vi.spyOn(window.history, "replaceState");

    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        listResult={availableList}
        loadTicketDetailAction={loadTicketDetailAction}
        logoutAction={noopAction}
        rows={[row, highRow]}
        setActiveConnectionAction={noopAction}
        tabs={[{ ...row }, { ...highRow }]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="agent@example.com"
      />,
    );

    await user.click(screen.getByRole("row", { name: /Webhook failed/u }));

    expect(screen.getByRole("tab", { name: /#1002/u })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText("Loading ticket thread...")).toBeInTheDocument();
    expect(routerPush).not.toHaveBeenCalled();
    expect(replaceState).toHaveBeenLastCalledWith(
      null,
      "",
      "/workspace?ticket=ticket-2",
    );
    expect(loadTicketDetailAction).toHaveBeenCalledWith("ticket-2");
  });

  it("renders unavailable results per ticket", async () => {
    const user = userEvent.setup();
    const loadTicketDetailAction = vi.fn(async () => ({
      status: "unavailable" as const,
      reason: "provider-temporary-failure" as const,
      retryable: true,
    }));

    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        listResult={availableList}
        loadTicketDetailAction={loadTicketDetailAction}
        logoutAction={noopAction}
        rows={[row, highRow]}
        setActiveConnectionAction={noopAction}
        tabs={[{ ...row }, { ...highRow }]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="agent@example.com"
      />,
    );

    await user.click(screen.getByRole("row", { name: /Webhook failed/u }));

    expect(
      await screen.findByText("The helpdesk workspace could not be reached."),
    ).toBeInTheDocument();
  });

  it("keeps the newest ticket active when an older detail response arrives later", async () => {
    const user = userEvent.setup();
    const detailA = detailPropsFor(row, "Older ticket response");
    const detailB = detailPropsFor(highRow, "Newest ticket response");
    const deferredA = deferred<WorkspaceTicketDetailLoadResult>();
    const deferredB = deferred<WorkspaceTicketDetailLoadResult>();
    const loadTicketDetailAction = vi.fn((ticketId: string) =>
      ticketId === "ticket-1" ? deferredA.promise : deferredB.promise,
    );

    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        listResult={availableList}
        loadTicketDetailAction={loadTicketDetailAction}
        logoutAction={noopAction}
        rows={[row, highRow]}
        setActiveConnectionAction={noopAction}
        tabs={[{ ...row }, { ...highRow }]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="agent@example.com"
      />,
    );

    await user.click(screen.getByRole("row", { name: /Cannot log in/u }));
    await user.click(screen.getByRole("tab", { name: "Return to list: All tickets" }));
    await user.click(screen.getByRole("row", { name: /Webhook failed/u }));

    expect(screen.getByRole("tab", { name: /#1002/u })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    deferredA.resolve(detailA.detailResult);

    await waitFor(() => expect(loadTicketDetailAction).toHaveBeenCalledTimes(2));
    expect(screen.getByRole("tab", { name: /#1002/u })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.queryByText("Older ticket response")).toBeNull();

    deferredB.resolve(detailB.detailResult);

    expect(await screen.findByText("Newest ticket response")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /#1001/u }));

    expect(screen.getByText("Older ticket response")).toBeInTheDocument();
    expect(loadTicketDetailAction).toHaveBeenCalledTimes(2);
  });

  it("keeps direct initial ticket URLs server-loaded without invoking the client loader", () => {
    const detailProps = selectedDetailProps();
    const loadTicketDetailAction = vi.fn(async () => detailProps.detailResult);

    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        detail={detailProps.detail}
        detailResult={detailProps.detailResult}
        listResult={availableList}
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

    expect(screen.getByLabelText("Ticket detail #1001")).toBeInTheDocument();
    expect(loadTicketDetailAction).not.toHaveBeenCalled();
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
