import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  defaultWorkspaceTicketColumns,
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

describe("TicketWorkspace client detail loader", () => {
  beforeEach(() => {
    vi.useRealTimers();
    routerPush.mockClear();
    window.history.replaceState(null, "", "/workspace");
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
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
    expect(screen.getByLabelText("Ticket detail #1002")).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Loading ticket thread" }))
      .toBeInTheDocument();
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

  it("replaces a merged source tab and URL with the final ticket", async () => {
    const user = userEvent.setup();
    const target = detailPropsFor(highRow, "Final merged ticket");
    const loadTicketDetailAction = vi.fn(async (): Promise<WorkspaceTicketDetailLoadResult> => ({
      status: "available",
      detail: target.detail,
      resolution: {
        cause: "merged",
        sources: [{ externalId: row.id, number: "1001" }],
        targetExternalId: highRow.id,
      },
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

    await user.click(screen.getByRole("row", { name: /Cannot log in/u }));

    expect(await screen.findByText("Final merged ticket")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /#1002/u })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.queryByRole("tab", { name: /#1001/u })).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Ticket #1001 was merged into #1002.",
    );
    expect(window.location.search).toBe("?ticket=ticket-2");
  });

  it("renders a read-only tombstone for an unresolved merged ticket", async () => {
    const user = userEvent.setup();
    const loadTicketDetailAction = vi.fn(async (): Promise<WorkspaceTicketDetailLoadResult> => ({
      status: "retired",
      reason: "merged-target-unavailable",
      retryable: false,
      sourceExternalId: row.id,
      sourceNumber: "1001",
    }));

    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        listResult={availableList}
        loadTicketDetailAction={loadTicketDetailAction}
        logoutAction={noopAction}
        rows={[row]}
        setActiveConnectionAction={noopAction}
        tabs={[{ ...row }]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="agent@example.com"
      />,
    );

    await user.click(screen.getByRole("row", { name: /Cannot log in/u }));

    expect(
      await screen.findByText("This ticket was merged, but its destination is unavailable."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Update" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Comment" })).toBeNull();
  });

});
