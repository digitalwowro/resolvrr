"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/components/ui/classnames";
import type {
  SummarizeWorkspaceTicketAction,
  TicketAiSummaryResult,
} from "@/features/ai";
import type { WorkspaceTicketDetail } from "@/features/tickets/workspace-adapter";

type TicketAiSummaryPanelProps = {
  detail: WorkspaceTicketDetail;
  summarizeTicketAction: SummarizeWorkspaceTicketAction;
};

function summaryStatusText(result: TicketAiSummaryResult | undefined) {
  if (!result) {
    return "No summary generated";
  }
  if (result.status === "available") {
    return `Source updated ${result.source.ticketUpdatedAt}; ${result.source.articleCount} articles`;
  }
  if (result.status === "unconfigured" && result.reason === "ai-disabled") {
    return "AI is disabled for this workspace";
  }
  if (
    result.status === "unconfigured" &&
    result.reason === "missing-workspace-ai-config"
  ) {
    return "Workspace AI settings need setup";
  }
  if (
    result.status === "unconfigured" &&
    result.reason === "missing-user-ai-config"
  ) {
    return "Add your AI key in Settings";
  }
  if (result.status === "unconfigured") {
    return "AI settings need attention";
  }
  if (result.reason === "provider-rate-limited") {
    return "AI provider is rate limited";
  }
  if (result.reason === "provider-auth-failed") {
    return "AI provider authentication failed";
  }
  if (result.reason === "ticket-unavailable") {
    return "Ticket detail is unavailable";
  }
  return "AI summary is temporarily unavailable";
}

export function TicketAiSummaryPanel({
  detail,
  summarizeTicketAction,
}: TicketAiSummaryPanelProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TicketAiSummaryResult>();

  async function handleSummarize() {
    setLoading(true);
    try {
      setResult(
        await summarizeTicketAction({ ticketExternalId: detail.id }),
      );
    } finally {
      setLoading(false);
    }
  }

  const available = result?.status === "available";

  return (
    <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Sparkles aria-hidden="true" className="size-4 shrink-0 text-indigo-600" />
          <div className="min-w-0">
            <div className="text-xs font-semibold text-slate-900">AI summary</div>
            <div className="truncate text-xs text-slate-600">
              {summaryStatusText(result)}
            </div>
          </div>
        </div>
        <Button
          className="shrink-0"
          disabled={loading}
          loading={loading}
          onClick={handleSummarize}
          type="button"
          variant="secondary"
        >
          {available ? "Regenerate" : "Generate"}
        </Button>
      </div>
      {available ? (
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800">
          {result.summary}
        </p>
      ) : result ? (
        <p
          className={cn(
            "mt-2 text-sm",
            result.status === "unconfigured" ? "text-slate-600" : "text-amber-700",
          )}
        >
          {summaryStatusText(result)}
        </p>
      ) : null}
    </div>
  );
}
