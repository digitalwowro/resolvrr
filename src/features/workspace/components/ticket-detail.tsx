"use client";

import { useState, type ReactNode } from "react";
import { Check, Copy, ExternalLink, RefreshCw } from "lucide-react";
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
import type { SummarizeWorkspaceTicketAction } from "@/features/ai";
import type { WorkspaceTicketDetail } from "@/features/tickets/workspace-adapter";
import type { TicketMetadataSavedPatch } from "./metadata-draft";
import { StateIcon } from "./ticket-table-cells";
import { TicketMetadataEditor } from "./ticket-metadata-editor";
import { TicketAiSummaryPanel } from "./ticket-ai-summary-panel";
import { ticketPath } from "./workspace-url";
export { TicketDetailLoadingShell } from "./ticket-detail-loading-shell";

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
  roundedTop = true,
  searchTicketLinkTargetsAction,
  summarizeTicketAction,
  updateTicketMetadataAction,
}: TicketDetailProps) {
  const [ticketLinkCopied, setTicketLinkCopied] = useState(false);

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

  const detailHeader: ReactNode = (
    <div className="border-b border-slate-200 px-4 py-3">
      <div className="space-y-2">
        <div className="flex min-w-0 items-center gap-3">
          <Tooltip content={`State: ${detail.state}`} side="bottom">
            <span
              aria-label={`Ticket state: ${detail.state}`}
              className="inline-grid size-5 shrink-0 place-items-center"
            >
              <StateIcon state={detail.stateKey} />
            </span>
          </Tooltip>
          <span className="shrink-0 text-xl text-black">{detail.number}</span>
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <h2 className="min-w-0 truncate text-xl font-semibold text-black">
              {detail.title}
            </h2>
            <Tooltip
              content={ticketLinkCopied ? "Ticket link copied" : "Copy ticket link"}
            >
              <button
                aria-label="Copy ticket link"
                className="inline-grid size-6 shrink-0 place-items-center rounded-md text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
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
                className="inline-grid size-6 shrink-0 place-items-center rounded-md text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-wait disabled:opacity-60"
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
                  className="inline-grid size-6 shrink-0 place-items-center rounded-md text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                  href={detail.providerUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  <ExternalLink aria-hidden="true" className="size-3.5" />
                </a>
              </Tooltip>
            ) : null}
          </div>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-y-1 text-xs">
          <span className="mr-1.5 inline-flex min-w-0 items-center gap-1">
            <span>Customer:</span>
            <span className="min-w-0 truncate font-semibold text-indigo-600">
              {detail.customer}
            </span>
          </span>
          <span aria-hidden="true" className="mr-1.5">
            ·
          </span>
          <span className="mr-1.5 inline-flex min-w-0 items-center gap-1">
            <span>Owner:</span>
            <span className="min-w-0 truncate font-semibold text-indigo-600">
              {detail.owner}
            </span>
          </span>
          {detail.createdAt ? (
            <>
              <span aria-hidden="true" className="mr-1.5">
                ·
              </span>
              <span className="mr-1.5">
                Created: <span className="font-semibold">{detail.createdAt}</span>
              </span>
            </>
          ) : null}
          <span aria-hidden="true" className="mr-1.5">
            ·
          </span>
          <span>
            Updated: <span className="font-semibold">{detail.updatedAt}</span>
          </span>
        </div>
        <TicketAiSummaryPanel
          detail={detail}
          key={detail.id}
          summarizeTicketAction={summarizeTicketAction}
        />
      </div>
    </div>
  );

  return (
    <section
      aria-label={`Ticket detail ${detail.number}`}
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-hidden border-x border-slate-200 bg-white",
        roundedTop && "rounded-t-md border-t",
      )}
    >
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
    </section>
  );
}
