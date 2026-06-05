import { act, render, screen, within } from "@testing-library/react";
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
  noopAction,
  noopMutationAction,
  row,
  selectedDetailProps,
} from "./ticket-workspace-test-utils";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
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

describe("TicketWorkspace detail refresh", () => {
  beforeEach(() => {
    vi.useRealTimers();
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
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

    expect(loadTicketDetailAction).toHaveBeenCalledWith(
      "ticket-1",
      { cacheMode: "bypass" },
    );
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

    expect(loadTicketDetailAction).toHaveBeenCalledWith(
      "ticket-1",
      { cacheMode: "bypass" },
    );
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

    expect(loadTicketDetailAction).toHaveBeenCalledWith(
      "ticket-1",
      { cacheMode: "bypass" },
    );
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
