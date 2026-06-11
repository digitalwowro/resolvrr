"use client";

import { useRef, useState, type ReactNode } from "react";
import {
  Building2,
  Check,
  Copy,
  ExternalLink,
  Mail,
  RefreshCw,
  Sparkles,
  UserRound,
} from "lucide-react";
import { Tooltip } from "@/components/ui";
import { cn } from "@/components/ui/classnames";
import type {
  SelectedTicketUpdatePayload,
  TicketMetadataMutationActionState,
  TicketMetadataMutationCapabilities,
} from "@/features/tickets/mutation-model";
import type {
  SearchWorkspaceTicketLinkTargetsAction,
  WorkspaceTicketLinkTarget,
} from "@/features/tickets/link-target-search-action-result";
import type {
  TicketCommunicationCapabilities,
} from "@/features/tickets/communication-model";
import type {
  SummarizeWorkspaceTicketAction,
  TicketAiSummaryResult,
} from "@/features/ai";
import type { WorkspaceTicketDetail } from "@/features/tickets/workspace-adapter";
import type { TicketMetadataSavedPatch } from "./metadata-draft";
import { TicketMetadataEditor } from "./ticket-metadata-editor";
import { TicketAiSummaryPanel } from "./ticket-ai-summary-panel";
import { TicketPriorityDot } from "./ticket-priority-dot";
import { TicketStateBadge } from "./ticket-state-badge";
import { ticketPath } from "./workspace-url";
export { TicketDetailLoadingShell } from "./ticket-detail-loading-shell";

type TicketSummaryState = {
  loading: boolean;
  result?: TicketAiSummaryResult;
  ticketId: string;
};

type TicketDetailProps = {
  communicationCapabilities: TicketCommunicationCapabilities;
  detail: WorkspaceTicketDetail;
  metadataMutationCapabilities?: TicketMetadataMutationCapabilities;
  onMetadataSaved(metadata: TicketMetadataSavedPatch): void;
  onMetadataSavedDetailRefresh(ticketId: string): void;
  onRefresh(): void;
  onReturnToListAfterUpdate(): void;
  recentlyViewedLinkTargets: WorkspaceTicketLinkTarget[];
  refreshing?: boolean;
  roundedTop?: boolean;
  searchTicketLinkTargetsAction: SearchWorkspaceTicketLinkTargetsAction;
  summarizeTicketAction: SummarizeWorkspaceTicketAction;
  updateTicketMetadataAction(
    request: SelectedTicketUpdatePayload,
  ): Promise<TicketMetadataMutationActionState>;
};

export function TicketDetail({
  communicationCapabilities,
  detail,
  metadataMutationCapabilities,
  onMetadataSaved,
  onMetadataSavedDetailRefresh,
  onRefresh,
  onReturnToListAfterUpdate,
  recentlyViewedLinkTargets,
  refreshing = false,
  searchTicketLinkTargetsAction,
  summarizeTicketAction,
  updateTicketMetadataAction,
}: TicketDetailProps) {
  const [ticketLinkCopied, setTicketLinkCopied] = useState(false);
  const [summaryState, setSummaryState] = useState<TicketSummaryState>({
    loading: false,
    ticketId: detail.id,
  });
  const summaryRequestRef = useRef(0);
  const customerEmail = detailCustomerEmail(detail);

  if (summaryState.ticketId !== detail.id) {
    setSummaryState({ loading: false, ticketId: detail.id });
  }

  const summaryStateMatchesTicket = summaryState.ticketId === detail.id;
  const summaryLoading = summaryStateMatchesTicket ? summaryState.loading : false;
  const summaryResult = summaryStateMatchesTicket ? summaryState.result : undefined;

  function copyTicketLink() {
    if (!window.navigator.clipboard) {
      return;
    }

    const ticketUrl = new URL(ticketPath(detail.id), window.location.origin);
    void window.navigator.clipboard.writeText(ticketUrl.toString()).then(() => {
      setTicketLinkCopied(true);
      window.setTimeout(() => setTicketLinkCopied(false), 1500);
    });
  }

  async function summarizeTicket() {
    const requestId = summaryRequestRef.current + 1;
    const ticketId = detail.id;
    summaryRequestRef.current = requestId;
    setSummaryState({ loading: true, result: summaryResult, ticketId });

    let nextResult: TicketAiSummaryResult | undefined;

    try {
      nextResult = await summarizeTicketAction({ ticketExternalId: ticketId });
    } finally {
      if (summaryRequestRef.current === requestId) {
        setSummaryState((current) => ({
          loading: false,
          result:
            nextResult ??
            (current.ticketId === ticketId ? current.result : undefined),
          ticketId,
        }));
      }
    }
  }

  const titleActions = (
    <div className="inline-flex shrink-0 items-center gap-1">
      <Tooltip content={ticketLinkCopied ? "Ticket link copied" : "Copy ticket link"}>
        <button
          aria-label="Copy ticket link"
          className="inline-grid size-6 shrink-0 place-items-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          onClick={copyTicketLink}
          type="button"
        >
          {ticketLinkCopied ? (
            <Check aria-hidden="true" className="size-3.5" />
          ) : (
            <Copy aria-hidden="true" className="size-3.5" />
          )}
        </button>
      </Tooltip>
      <Tooltip content={refreshing ? "Refreshing ticket" : "Refresh ticket"}>
        <button
          aria-label="Refresh ticket"
          aria-busy={refreshing || undefined}
          className="inline-grid size-6 shrink-0 place-items-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-wait disabled:opacity-60"
          disabled={refreshing}
          onClick={onRefresh}
          type="button"
        >
          <RefreshCw
            aria-hidden="true"
            className={cn("size-3.5", refreshing && "animate-spin")}
          />
        </button>
      </Tooltip>
      {detail.providerUrl ? (
        <Tooltip content="Open ticket in helpdesk">
          <a
            aria-label="Open ticket in helpdesk"
            className="inline-grid size-6 shrink-0 place-items-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            href={detail.providerUrl}
            rel="noreferrer"
            target="_blank"
          >
            <ExternalLink aria-hidden="true" className="size-3.5" />
          </a>
        </Tooltip>
      ) : null}
      {summaryResult ? null : (
        <button
          className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-wait disabled:opacity-60"
          disabled={summaryLoading}
          onClick={summarizeTicket}
          type="button"
        >
          {summaryLoading ? (
            <span
              aria-hidden="true"
              className="size-3 animate-spin rounded-full border-2 border-current border-t-transparent"
            />
          ) : (
            <Sparkles aria-hidden="true" className="size-3.5" />
          )}
          <span>Generate AI summary</span>
        </button>
      )}
    </div>
  );

  const detailHeader: ReactNode = (
    <div className="pt-4 pl-4 pr-0">
      <div className="space-y-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs text-slate-600">
          <Tooltip content={`Priority: ${detail.priority}`} side="bottom">
            <TicketPriorityDot
              priority={detail.priorityKey}
              priorityLabel={detail.priority}
            />
          </Tooltip>
          <span className="shrink-0 text-sm font-medium text-slate-950">
            {detail.number}
          </span>
          <TicketStateBadge label={detail.state} state={detail.stateKey} />
          {detail.createdAt ? (
            <>
              <span aria-hidden="true">·</span>
              <span className="shrink-0">Created {detail.createdAt}</span>
            </>
          ) : null}
          <span aria-hidden="true">·</span>
          <span className="shrink-0">Updated {detail.updatedAt}</span>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="min-w-0 truncate text-xl font-semibold text-black">
            {detail.title}
          </h2>
          {titleActions}
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-700">
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <UserRound aria-hidden="true" className="size-3.5 shrink-0 text-slate-500" />
            <span className="min-w-0 truncate">{detail.customer}</span>
          </span>
          {customerEmail ? (
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <Mail aria-hidden="true" className="size-3.5 shrink-0 text-slate-500" />
              <span className="min-w-0 truncate">{customerEmail}</span>
            </span>
          ) : null}
          {detail.customerOrganization ? (
            <span
              aria-label={`Customer organization: ${detail.customerOrganization}`}
              className="inline-flex min-w-0 items-center gap-1.5"
            >
              <Building2
                aria-hidden="true"
                className="size-3.5 shrink-0 text-slate-500"
              />
              <span className="min-w-0 truncate">
                {detail.customerOrganization}
              </span>
            </span>
          ) : null}
        </div>
        {summaryResult ? (
          <TicketAiSummaryPanel
            loading={summaryLoading}
            onSummarize={summarizeTicket}
            result={summaryResult}
          />
        ) : (
          <div className="-ml-4 mt-4 border-t border-slate-200" />
        )}
      </div>
    </div>
  );

  return (
    <TicketMetadataEditor
      communicationCapabilities={communicationCapabilities}
      detail={detail}
      header={detailHeader}
      metadataMutationCapabilities={
        metadataMutationCapabilities ?? { state: false, priority: false }
      }
      onMetadataSaved={onMetadataSaved}
      onMetadataSavedDetailRefresh={onMetadataSavedDetailRefresh}
      onReturnToListAfterUpdate={onReturnToListAfterUpdate}
      recentlyViewedLinkTargets={recentlyViewedLinkTargets}
      searchTicketLinkTargetsAction={searchTicketLinkTargetsAction}
      updateTicketMetadataAction={updateTicketMetadataAction}
    />
  );
}

function detailCustomerEmail(detail: WorkspaceTicketDetail) {
  const customerArticle = detail.articles.find(
    (article) =>
      article.from.email &&
      (article.from.label === detail.customer || article.author === detail.customer),
  );

  return (
    customerArticle?.from.email ??
    detail.articles.find((article) => article.direction === "inbound" && article.from.email)
      ?.from.email
  );
}
