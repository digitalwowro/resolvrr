import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  availableTicketLookupList,
  unavailableTicketLookupList,
} from "@/core/ticket-lookups";
import { defaultWorkspaceTicketColumns } from "@/features/tickets";
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

describe("TicketWorkspace lookup data", () => {
  beforeEach(() => {
    routerPush.mockClear();
    routerRefresh.mockClear();
  });

  it("renders lookup options without making lookup failures fatal", () => {
    const detailProps = selectedDetailProps();
    detailProps.detail.lookupData = {
      assignableUsers: availableTicketLookupList([
        { externalId: "user-1", label: "Riley Stone" },
        { externalId: "user-2", label: "Zara Lane" },
      ]),
      groups: unavailableTicketLookupList("provider-temporary-failure", true),
    };

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
    const sidebar = screen.getByRole("complementary");
    expect(within(sidebar).getByText("Owner options")).toBeInTheDocument();
    expect(within(sidebar).getByText("Riley Stone")).toBeInTheDocument();
    expect(within(sidebar).getByText("Zara Lane")).toBeInTheDocument();
    expect(within(sidebar).getByText("Group options")).toBeInTheDocument();
    expect(within(sidebar).getByText("Temporarily unavailable")).toBeInTheDocument();
  });
});
