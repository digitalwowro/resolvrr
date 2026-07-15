import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { defaultWorkspaceTicketColumns } from "@/features/tickets";
import { TicketWorkspace } from "@/features/workspace/components/ticket-workspace";
import {
  noopAction,
  noopMutationAction,
} from "./ticket-workspace-test-utils";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

describe("workspace personal connection requirement", () => {
  it("keeps the shared workspace selected while blocking provider-backed content", () => {
    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{
          active: true,
          connectionId: null,
          id: "workspace-1",
          label: "Support",
          status: "disconnected",
        }]}
        listResult={{
          reason: "personal-connection-required",
          retryable: false,
          status: "unavailable",
        }}
        logoutAction={noopAction}
        rows={[]}
        setActiveConnectionAction={noopAction}
        tabs={[]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="agent@example.com"
      />,
    );

    expect(screen.getByText(
      "Connect your own helpdesk account to use this workspace.",
    )).toBeInTheDocument();
    expect(screen.queryByRole("table", { name: "Tickets" })).toBeNull();
  });
});
