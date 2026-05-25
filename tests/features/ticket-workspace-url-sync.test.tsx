import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultWorkspaceTicketColumns } from "@/features/tickets";
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
const writeText = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPush,
    refresh: vi.fn(),
  }),
}));

describe("TicketWorkspace URL sync", () => {
  beforeEach(() => {
    routerPush.mockClear();
    writeText.mockReset();
    Object.defineProperty(window.navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    window.history.replaceState(null, "", "/workspace?ticket=ticket-1");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps direct initial ticket URLs server-loadable", () => {
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

    expect(screen.getByLabelText("Ticket detail #1001")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /#1001/u })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("copies an explicit direct ticket link from the selected detail header", () => {
    writeText.mockResolvedValue(undefined);
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

    fireEvent.click(screen.getByRole("button", { name: "Copy ticket link" }));

    expect(writeText).toHaveBeenCalledWith(
      "http://localhost:3000/workspace?ticket=ticket-1",
    );
  });

  it("closes the active tab to another open tab with replaceState", async () => {
    const user = userEvent.setup();
    const detailA = detailPropsFor(row, "First ticket thread");
    const detailB = detailPropsFor(highRow, "Second ticket thread");
    const { rerender } = render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        detail={detailA.detail}
        detailResult={detailA.detailResult}
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
    await user.click(screen.getByRole("row", { name: /Webhook failed/u }));

    rerender(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        detail={detailB.detail}
        detailResult={detailB.detailResult}
        listResult={availableList}
        logoutAction={noopAction}
        rows={[row, highRow]}
        selectedTicketId="ticket-2"
        setActiveConnectionAction={noopAction}
        tabs={[{ ...row }, { ...highRow }]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="agent@example.com"
      />,
    );

    routerPush.mockClear();
    const replaceState = vi.spyOn(window.history, "replaceState");

    await user.click(screen.getByRole("button", { name: "Close #1002" }));

    expect(routerPush).not.toHaveBeenCalled();
    expect(replaceState).toHaveBeenLastCalledWith(
      null,
      "",
      "/workspace?ticket=ticket-1",
    );
    expect(screen.getByRole("tab", { name: /#1001/u })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText("First ticket thread")).toBeInTheDocument();
  });

  it("closes the last active tab back to List with replaceState", async () => {
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
    const replaceState = vi.spyOn(window.history, "replaceState");

    await user.click(screen.getByRole("button", { name: "Close #1001" }));

    expect(routerPush).not.toHaveBeenCalled();
    expect(replaceState).toHaveBeenLastCalledWith(null, "", "/workspace");
    expect(screen.getByRole("table", { name: "Tickets" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /#1001/u })).not.toBeInTheDocument();
  });

  it("keeps the next-tab fallback order when closing the active tab", async () => {
    const user = userEvent.setup();
    const thirdRow = {
      ...row,
      id: "ticket-3",
      number: "#1003",
      title: "Printer jammed",
    };
    const detailA = detailPropsFor(row, "First ticket thread");
    const detailB = detailPropsFor(highRow, "Second ticket thread");
    const detailC = detailPropsFor(thirdRow, "Third ticket thread");
    const { rerender } = render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        detail={detailA.detail}
        detailResult={detailA.detailResult}
        listResult={availableList}
        logoutAction={noopAction}
        rows={[row, highRow, thirdRow]}
        selectedTicketId="ticket-1"
        setActiveConnectionAction={noopAction}
        tabs={[{ ...row }, { ...highRow }, { ...thirdRow }]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="agent@example.com"
      />,
    );

    await user.click(screen.getByRole("tab", { name: "Return to list: All tickets" }));
    await user.click(screen.getByRole("row", { name: /Webhook failed/u }));

    rerender(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        detail={detailB.detail}
        detailResult={detailB.detailResult}
        listResult={availableList}
        logoutAction={noopAction}
        rows={[row, highRow, thirdRow]}
        selectedTicketId="ticket-2"
        setActiveConnectionAction={noopAction}
        tabs={[{ ...row }, { ...highRow }, { ...thirdRow }]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="agent@example.com"
      />,
    );

    await user.click(screen.getByRole("tab", { name: "Return to list: All tickets" }));
    await user.click(screen.getByRole("row", { name: /Printer jammed/u }));

    rerender(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        detail={detailC.detail}
        detailResult={detailC.detailResult}
        listResult={availableList}
        logoutAction={noopAction}
        rows={[row, highRow, thirdRow]}
        selectedTicketId="ticket-3"
        setActiveConnectionAction={noopAction}
        tabs={[{ ...row }, { ...highRow }, { ...thirdRow }]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="agent@example.com"
      />,
    );

    await user.click(screen.getByRole("tab", { name: /#1002/u }));

    routerPush.mockClear();
    const replaceState = vi.spyOn(window.history, "replaceState");

    await user.click(screen.getByRole("button", { name: "Close #1002" }));

    expect(routerPush).not.toHaveBeenCalled();
    expect(replaceState).toHaveBeenLastCalledWith(
      null,
      "",
      "/workspace?ticket=ticket-3",
    );
    expect(screen.getByRole("tab", { name: /#1003/u })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText("Third ticket thread")).toBeInTheDocument();
  });
});
