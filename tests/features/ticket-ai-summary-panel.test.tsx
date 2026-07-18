import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TicketAiSummaryPanel } from
  "@/features/workspace/components/ticket-ai-summary-panel";

const source = {
  articleCount: 3,
  ticketNumber: "#1001",
  ticketUpdatedAt: "2026-07-16T10:00:00.000Z",
};

describe("TicketAiSummaryPanel", () => {
  it("renders the structured operational brief", () => {
    render(
      <TicketAiSummaryPanel
        loading={false}
        onSummarize={vi.fn()}
        result={{
          generatedAt: "2026-07-16T11:00:00.000Z",
          source,
          status: "available",
          summary: {
            nextRisk: "The invoice may remain incorrect.",
            schemaVersion: "ticket-summary-v2",
            situation: "The customer received the wrong invoice.",
            timeline: [
              {
                date: "2026-07-01",
                event: "Customer confirmed the requested upgrade.",
              },
              {
                date: null,
                event: "Customer requested an update.",
              },
            ],
          },
        }}
      />,
    );

    const summary = screen.getByRole("region", { name: "AI summary" });
    expect(summary).toHaveClass(
      "border-l-2",
      "border-l-indigo-600",
      "bg-slate-50",
    );
    expect(within(summary).getByRole("heading", { name: "Situation" }))
      .toBeInTheDocument();
    expect(within(summary).getByRole("heading", { name: "Timeline" }))
      .toBeInTheDocument();
    expect(within(summary).getByRole("heading", { name: "Next Risk" }))
      .toBeInTheDocument();
    expect(within(summary).getByText("Jul 1")).toHaveAttribute(
      "datetime",
      "2026-07-01",
    );
    expect(within(summary).getByText("The invoice may remain incorrect."))
      .toBeInTheDocument();
  });

  it("omits optional sections without leaving empty headings", () => {
    render(
      <TicketAiSummaryPanel
        loading={false}
        onSummarize={vi.fn()}
        result={{
          generatedAt: "2026-07-16T11:00:00.000Z",
          source,
          status: "available",
          summary: {
            nextRisk: null,
            schemaVersion: "ticket-summary-v2",
            situation: "No material risk is currently supported.",
            timeline: [],
          },
        }}
      />,
    );

    expect(screen.getByRole("heading", { name: "Situation" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Timeline" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Next Risk" })).toBeNull();
  });
});
