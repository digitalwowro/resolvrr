import { act, render, screen, waitFor, within } from "@testing-library/react";
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

  it("silently refreshes the active ticket detail without showing the loading thread", async () => {
    vi.useFakeTimers();
    const detailProps = selectedDetailProps();
    const refreshed = detailPropsFor(row, "Fresh customer reply");
    const refreshResult = deferred<WorkspaceTicketDetailLoadResult>();
    const loadTicketDetailAction = vi.fn(() => refreshResult.promise);

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

    expect(screen.getByText("Hello there")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    expect(loadTicketDetailAction).toHaveBeenCalledWith("ticket-1");
    expect(screen.getByText("Hello there")).toBeInTheDocument();
    expect(screen.queryByRole("status", { name: "Loading ticket thread" }))
      .toBeNull();

    await act(async () => {
      refreshResult.resolve(refreshed.detailResult);
    });

    expect(screen.getByText("Fresh customer reply")).toBeInTheDocument();
  });

  it("refreshes a stale active ticket when the browser tab becomes visible", async () => {
    vi.useFakeTimers();
    const detailProps = selectedDetailProps();
    const refreshed = detailPropsFor(row, "Visible tab refresh");
    const loadTicketDetailAction = vi.fn(async () => refreshed.detailResult);

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

    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(loadTicketDetailAction).not.toHaveBeenCalled();

    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(loadTicketDetailAction).toHaveBeenCalledWith("ticket-1");
    expect(screen.getByText("Visible tab refresh")).toBeInTheDocument();
  });

  it("uses the ticket refresh button without replacing existing detail with a loader", async () => {
    const user = userEvent.setup();
    const detailProps = selectedDetailProps();
    const refreshResult = deferred<WorkspaceTicketDetailLoadResult>();
    const loadTicketDetailAction = vi.fn(() => refreshResult.promise);

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

    await user.click(screen.getByRole("button", { name: "Refresh ticket" }));

    expect(loadTicketDetailAction).toHaveBeenCalledWith("ticket-1");
    expect(screen.getByText("Hello there")).toBeInTheDocument();
    expect(screen.queryByRole("status", { name: "Loading ticket thread" }))
      .toBeNull();
  });

  it("keeps reply draft content when a silent ticket refresh completes", async () => {
    const user = userEvent.setup();
    const detailProps = selectedDetailProps();
    const refreshed = detailPropsFor(row, "Provider returned a newer article");
    const refreshResult = deferred<WorkspaceTicketDetailLoadResult>();
    const loadTicketDetailAction = vi.fn(() => refreshResult.promise);

    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        detail={detailProps.detail}
        detailResult={detailProps.detailResult}
        listResult={{
          ...availableList,
          communicationCapabilities: {
            customerReplies: true,
            internalNotes: false,
          },
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

    const article = screen.getByRole("article", {
      name: "Customer reply from Maya Patel",
    });
    await user.click(within(article).getByRole("button", { name: "Reply" }));
    await user.type(
      within(article).getByRole("textbox", { name: "Reply" }),
      "Draft stays",
    );

    await user.click(screen.getByRole("button", { name: "Refresh ticket" }));
    await act(async () => {
      refreshResult.resolve(refreshed.detailResult);
    });

    expect(screen.getByText("Provider returned a newer article"))
      .toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Reply" }))
      .toHaveTextContent("Draft stays");
  });

});
