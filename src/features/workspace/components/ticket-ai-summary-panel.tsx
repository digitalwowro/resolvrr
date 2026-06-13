import { Info, RefreshCw, Sparkles } from "lucide-react";
import { Button, Tooltip } from "@/components/ui";
import { cn } from "@/components/ui/classnames";
import type { TicketAiSummaryResult } from "@/features/ai";
import { formatWorkspaceRelativeTime } from "@/features/tickets/date-time-format";

type TicketAiSummaryPanelProps = {
  loading: boolean;
  onSummarize(forceRefresh?: boolean): void;
  result: TicketAiSummaryResult;
};

function summaryStatusText(result: TicketAiSummaryResult) {
  if (result.status === "available") {
    return "Summary generated";
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

function generatedStatusText(result: TicketAiSummaryResult) {
  if (result.status !== "available") {
    return undefined;
  }

  const generatedAt = formatWorkspaceRelativeTime(new Date(result.generatedAt));
  return `Generated ${generatedAt}`;
}

function summaryParagraphs(summary: string) {
  return summary
    .split(/\n+/u)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export function TicketAiSummaryPanel({
  loading,
  onSummarize,
  result,
}: TicketAiSummaryPanelProps) {
  const available = result.status === "available";
  const generatedLabel = generatedStatusText(result);

  return (
    <div className="-ml-4 mt-4 border-t border-slate-200 pl-4 pt-4">
      <div className="w-full rounded-md border border-indigo-100 bg-indigo-50/40 px-4 py-3">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Sparkles
              aria-hidden="true"
              className="size-6 shrink-0 text-indigo-600 drop-shadow-[0_0_6px_rgba(79,70,229,0.35)]"
            />
            <h3 className="min-w-0 truncate text-base font-semibold text-slate-950">
              AI summary
            </h3>
            <Tooltip
              content="AI can and will make mistakes. Always verify important information before relying on it."
              side="bottom"
            >
              <span
                aria-label="AI summary information"
                className="inline-flex size-4 shrink-0 items-center justify-center text-slate-500"
              >
                <Info aria-hidden="true" className="size-3.5" />
              </span>
            </Tooltip>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {generatedLabel ? (
              <span className="text-xs text-slate-500">{generatedLabel}</span>
            ) : null}
            <Button
              className="shrink-0"
              disabled={loading}
              icon={
                available ? (
                  <RefreshCw aria-hidden="true" className="size-3.5" />
                ) : undefined
              }
              loading={loading}
              onClick={() => onSummarize(available)}
              size="sm"
              type="button"
              variant="secondary"
            >
              {available ? "Regenerate" : "Generate"}
            </Button>
          </div>
        </div>
        <div className="pl-8">
          {available ? (
            <div className="space-y-1.5 text-sm leading-6 text-indigo-950">
              {summaryParagraphs(result.summary).map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          ) : (
            <p
              className={cn(
                "text-sm",
                result.status === "unconfigured"
                  ? "text-slate-600"
                  : "text-amber-700",
              )}
            >
              {summaryStatusText(result)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
