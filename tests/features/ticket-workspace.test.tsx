import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TicketWorkspace } from "@/features/workspace/components/ticket-workspace";
import type { TicketListReadResult } from "@/features/tickets";

const availableList = {
  status: "available",
  connectionName: "Support",
  tickets: [],
  measuredAt: new Date("2026-05-24T00:00:00Z"),
} satisfies TicketListReadResult;

describe("TicketWorkspace", () => {
  it("renders a disconnected state without an active connection", () => {
    render(
      <TicketWorkspace
        listResult={{
          status: "unavailable",
          reason: "no-active-connection",
          retryable: false,
        }}
        rows={[]}
        userEmail="agent@example.com"
      />,
    );

    expect(screen.getByText("Tickets unavailable")).toBeInTheDocument();
    expect(
      screen.getByText("No active helpdesk workspace is connected."),
    ).toBeInTheDocument();
  });

  it("renders provider-backed rows and selected detail", () => {
    render(
      <TicketWorkspace
        detail={{
          id: "ticket-1",
          number: "1001",
          title: "Cannot log in",
          customer: "Maya Patel",
          owner: "Agent Smith",
          state: "Open",
          priority: "High",
          updatedAt: "May 24, 2026, 8:30 AM",
          articles: [
            {
              id: "article-1",
              author: "Maya Patel",
              meta: "inbound · public · May 24, 2026, 8:31 AM",
              sanitizedHtml: "<p>Hello there</p>",
              visibility: "public",
            },
          ],
        }}
        detailResult={{
          status: "available",
          detail: {
            ticket: {
              externalId: "ticket-1",
              number: "1001",
              title: "Cannot log in",
              updatedAt: new Date("2026-05-24T08:30:00Z"),
              tags: [],
            },
            thread: { ticketExternalId: "ticket-1", articles: [] },
            links: [],
            subscription: { supported: false, following: false },
            measuredAt: new Date("2026-05-24T08:31:00Z"),
          },
        }}
        listResult={availableList}
        rows={[
          {
            id: "ticket-1",
            number: "1001",
            title: "Cannot log in",
            customer: "Maya Patel",
            owner: "Agent Smith",
            state: "Open",
            priority: "High",
            updatedAt: "May 24, 2026, 8:30 AM",
            preview: "Hello there",
          },
        ]}
        selectedTicketId="ticket-1"
        userEmail="agent@example.com"
      />,
    );

    const table = screen.getByRole("table");
    expect(within(table).getByText("1001")).toBeInTheDocument();
    expect(within(table).getByText("Cannot log in")).toBeInTheDocument();
    expect(screen.getAllByText("Maya Patel").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Hello there").length).toBeGreaterThan(0);
    expect(screen.queryByText("Billing follow-up for annual renewal")).toBeNull();
  });
});
