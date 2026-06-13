import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultWorkspaceTicketColumns } from "@/features/tickets";
import { TicketWorkspace } from "@/features/workspace/components/ticket-workspace";
import {
  workspaceOpenTabsStateVersion,
  type WorkspaceOpenTabsState,
} from "@/features/workspace/workspace-tab-state";
import {
  availableList,
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

function domRect({
  height,
  left,
  top,
  width,
}: {
  height: number;
  left: number;
  top: number;
  width: number;
}): DOMRect {
  return {
    bottom: top + height,
    height,
    left,
    right: left + width,
    toJSON: () => ({}),
    top,
    width,
    x: left,
    y: top,
  } as DOMRect;
}

function mockElementRect(element: Element, rect: DOMRect) {
  if (!(element instanceof HTMLElement)) {
    throw new Error("Expected an HTMLElement to mock a tab rect.");
  }
  vi.spyOn(element, "getBoundingClientRect").mockReturnValue(rect);
}

function tabWrapper(tab: HTMLElement) {
  const wrapper = tab.parentElement;
  if (!(wrapper instanceof HTMLElement)) {
    throw new Error("Expected tab to be rendered inside a drag wrapper.");
  }

  return wrapper;
}

describe("TicketWorkspace vertical tabs", () => {
  beforeEach(() => {
    routerPush.mockClear();
    window.history.replaceState(null, "", "/workspace?ticket=ticket-1");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps ticket tabs open across List and orientation switches", async () => {
    const user = userEvent.setup();
    const detailProps = selectedDetailProps();
    render(
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
        tabs={[{ ...row }]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="agent@example.com"
      />,
    );

    expect(
      screen.queryByRole("checkbox", { name: "Select all tickets" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Refresh list" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Return to list: All tickets" }));
    await user.click(screen.getByRole("button", { name: "Vertical tabs" }));

    expect(screen.getByRole("table", { name: "Tickets" })).toBeInTheDocument();
    expect(
      within(screen.getByRole("tab", { name: /Cannot log in/u })).getByLabelText(
        "Priority: Medium",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("toolbar", { name: "Ticket list controls" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Select all tickets" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Refresh list" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Horizontal tabs" }));

    expect(screen.getByRole("tab", { name: /#1001/u })).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /#1001/u }));

    expect(screen.getByLabelText("Ticket detail #1001")).toBeInTheDocument();
  });

  it("appends ticket tabs when opening another ticket from List", async () => {
    const user = userEvent.setup();
    const detailProps = selectedDetailProps();
    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        detail={detailProps.detail}
        detailResult={detailProps.detailResult}
        listResult={availableList}
        logoutAction={noopAction}
        rows={[row, highRow]}
        selectedTicketId="ticket-1"
        setActiveConnectionAction={noopAction}
        tabs={[{ ...row }, { ...highRow }]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="agent@example.com"
      />,
    );

    await user.click(screen.getByRole("tab", { name: "Return to list: All tickets" }));
    await user.click(screen.getByRole("button", { name: "Vertical tabs" }));
    await user.click(screen.getByRole("row", { name: /Webhook failed/u }));

    expect(screen.getByRole("tab", { name: /Cannot log in/u })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Webhook failed/u })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("reorders vertical ticket tabs with drag", async () => {
    const user = userEvent.setup();
    const detailProps = selectedDetailProps();
    const initialWorkspaceOpenTabsState = {
      activePane: "ticket-1",
      openTabs: [row, highRow],
      recentTabs: [],
      tabOrientation: "horizontal",
      updatedAt: "2026-06-02T00:00:00.000Z",
      version: workspaceOpenTabsStateVersion,
    } satisfies WorkspaceOpenTabsState;
    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        detail={detailProps.detail}
        detailResult={detailProps.detailResult}
        initialWorkspaceOpenTabsState={initialWorkspaceOpenTabsState}
        listResult={availableList}
        logoutAction={noopAction}
        rows={[row, highRow]}
        selectedTicketId="ticket-1"
        setActiveConnectionAction={noopAction}
        tabs={[{ ...row }, { ...highRow }]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="agent@example.com"
      />,
    );

    await user.click(screen.getByRole("tab", { name: "Return to list: All tickets" }));
    await user.click(screen.getByRole("button", { name: "Vertical tabs" }));

    const firstTab = screen.getByRole("tab", { name: /Cannot log in/u });
    const secondTab = screen.getByRole("tab", { name: /Webhook failed/u });
    const firstTabWrapper = tabWrapper(firstTab);
    const secondTabWrapper = tabWrapper(secondTab);
    mockElementRect(
      firstTabWrapper,
      domRect({ height: 52, left: 0, top: 60, width: 240 }),
    );
    mockElementRect(
      secondTabWrapper,
      domRect({ height: 52, left: 0, top: 112, width: 240 }),
    );

    fireEvent.pointerDown(secondTabWrapper, {
      button: 0,
      clientX: 40,
      clientY: 132,
      pointerId: 2,
    });
    fireEvent.pointerMove(secondTabWrapper, {
      clientX: 40,
      clientY: 70,
      pointerId: 2,
    });
    fireEvent.pointerUp(secondTabWrapper, {
      clientX: 40,
      clientY: 70,
      pointerId: 2,
    });

    await waitFor(() =>
      expect(screen.getAllByRole("tab")[1]).toHaveTextContent("Webhook failed"),
    );
    expect(screen.getAllByRole("tab")[2]).toHaveTextContent("Cannot log in");
    expect(screen.getByRole("table", { name: "Tickets" })).toBeInTheDocument();
  });
});
