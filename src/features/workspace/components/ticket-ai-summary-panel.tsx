import {
  Clock3,
  FileText,
  Info,
  RefreshCw,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import type { ReactNode } from "react";
import { Button, Tooltip } from "@/components/ui";
import { cn } from "@/components/ui/classnames";
import type { TicketAiSummaryResult } from "@/features/ai";
import {
  ticketSummaryDisplayDate,
  type TicketAiSummaryContent,
} from "@/features/ai/ticket-summary-content";
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
  if (result.reason === "provider-invalid-response") {
    return "AI provider returned an invalid summary";
  }
  if (result.reason === "provider-auth-failed") {
    return "AI provider authentication failed";
  }
  if (result.reason === "provider-request-rejected") {
    return "AI provider rejected this request";
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

function SummarySectionLabel({
  children,
  icon,
  id,
}: {
  children: string;
  icon: ReactNode;
  id: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-5 shrink-0 place-items-center text-indigo-600">
        {icon}
      </span>
      <h4
        className="text-xs font-semibold uppercase tracking-wide text-slate-600"
        id={id}
      >
        {children}
      </h4>
    </div>
  );
}

function AvailableSummary({ summary }: { summary: TicketAiSummaryContent }) {
  return (
    <div>
      <section className="px-4 py-4" aria-labelledby="ai-summary-situation">
        <SummarySectionLabel
          icon={<FileText aria-hidden="true" className="size-4" />}
          id="ai-summary-situation"
        >
          Situation
        </SummarySectionLabel>
        <p
          className="mt-2 pl-8 text-sm font-medium leading-6 text-slate-900"
        >
          {summary.situation}
        </p>
      </section>
      {summary.timeline.length > 0 ? (
        <section
          aria-labelledby="ai-summary-timeline"
          className="border-t border-slate-200 px-4 py-4"
        >
          <SummarySectionLabel
            icon={<Clock3 aria-hidden="true" className="size-4" />}
            id="ai-summary-timeline"
          >
            Timeline
          </SummarySectionLabel>
          <ol className="mt-3 ml-8 space-y-3 border-l border-indigo-200 pl-4">
            {summary.timeline.map((item, index) => (
              <li
                className="flex min-w-0 items-start gap-3 text-sm leading-5"
                key={`${item.date ?? "undated"}-${index}-${item.event}`}
              >
                <span
                  aria-hidden="true"
                  className="-ml-5 mt-1.5 size-2 shrink-0 rounded-full bg-indigo-600 ring-4 ring-slate-50"
                />
                {item.date ? (
                  <time
                    className="w-12 shrink-0 font-medium text-slate-500"
                    dateTime={item.date}
                  >
                    {ticketSummaryDisplayDate(item.date)}
                  </time>
                ) : (
                  <span aria-hidden="true" className="w-12 shrink-0" />
                )}
                <span className="min-w-0 text-slate-800">{item.event}</span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
      {summary.nextRisk ? (
        <section
          aria-labelledby="ai-summary-next-risk"
          className="border-t border-amber-100 bg-amber-50/60 px-4 py-3"
        >
          <div className="flex items-start gap-3">
            <TriangleAlert
              aria-hidden="true"
              className="mt-0.5 size-5 shrink-0 text-amber-700"
            />
            <div className="min-w-0">
              <h4
                className="text-xs font-semibold uppercase tracking-wide text-amber-800"
                id="ai-summary-next-risk"
              >
                Next Risk
              </h4>
              <p className="mt-1 text-sm leading-5 text-slate-800">
                {summary.nextRisk}
              </p>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

export function TicketAiSummaryPanel({
  loading,
  onSummarize,
  result,
}: TicketAiSummaryPanelProps) {
  const available = result.status === "available";
  const generatedLabel = generatedStatusText(result);

  return (
    <div className="-ml-4 mt-4 border-t border-slate-200 pl-4 pr-4 pt-4">
      <section
        aria-label="AI summary"
        className="w-full overflow-hidden rounded-md border border-indigo-100 border-l-2 border-l-indigo-600 bg-slate-50"
      >
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 px-4 py-3">
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
        {available ? (
          <AvailableSummary summary={result.summary} />
        ) : (
          <div className="px-4 pb-4 pl-12">
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
          </div>
        )}
      </section>
    </div>
  );
}
