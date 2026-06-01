"use client";

import { useState, type ReactNode } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
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
  WorkspaceTicketDetail,
  WorkspaceTicketRow,
  WorkspaceTicketTab,
} from "@/features/tickets/workspace-adapter";
import type { TicketMetadataSavedPatch } from "./metadata-draft";
import { StateIcon } from "./ticket-table-cells";
import { TicketDetailSidebar } from "./ticket-detail-sidebar";
import { TicketMetadataEditor } from "./ticket-metadata-editor";
import { ticketPath } from "./workspace-url";

type TicketDetailProps = {
  communicationCapabilities: TicketCommunicationCapabilities;
  detail: WorkspaceTicketDetail;
  metadataMutationCapabilities?: TicketMetadataMutationCapabilities;
  onMetadataSaved(metadata: TicketMetadataSavedPatch): void;
  onMetadataSavedDetailRefresh(ticketId: string): void;
  onReturnToListAfterUpdate(): void;
  recentlyViewedLinkTargets: WorkspaceTicketLinkTarget[];
  roundedTop?: boolean;
  searchTicketLinkTargetsAction: SearchWorkspaceTicketLinkTargetsAction;
  updateTicketMetadataAction(
    request: SelectedTicketUpdatePayload,
  ): Promise<TicketMetadataMutationActionState>;
};

type TicketDetailLoadingSummary = WorkspaceTicketTab &
  Partial<Pick<WorkspaceTicketRow, "createdAt" | "providerUrl" | "updatedAt">>;

export function TicketDetail({
  communicationCapabilities,
  detail,
  metadataMutationCapabilities,
  onMetadataSaved,
  onMetadataSavedDetailRefresh,
  onReturnToListAfterUpdate,
  recentlyViewedLinkTargets,
  roundedTop = true,
  searchTicketLinkTargetsAction,
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
      </div>
    </div>
  );

  return (
    <section
      aria-label={`Ticket detail ${detail.number}`}
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-hidden border-x border-t border-slate-200 bg-white",
        roundedTop && "rounded-t-md",
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

export function TicketDetailLoadingShell({
  roundedTop = true,
  ticket,
}: {
  roundedTop?: boolean;
  ticket: TicketDetailLoadingSummary;
}) {
  return (
    <section
      aria-label={`Ticket detail ${ticket.number}`}
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-hidden border-x border-t border-slate-200 bg-white",
        roundedTop && "rounded-t-md",
      )}
    >
      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1 overflow-hidden py-4 pl-4 pr-2">
          <section
            aria-label="Ticket conversation"
            className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-slate-200 bg-white"
          >
            <div className="border-b border-slate-200 px-4 py-3">
              <div className="space-y-2">
                <div className="flex min-w-0 items-center gap-3">
                  <Tooltip content={`State: ${ticket.state}`} side="bottom">
                    <span
                      aria-label={`Ticket state: ${ticket.state}`}
                      className="inline-grid size-5 shrink-0 place-items-center"
                    >
                      <StateIcon state={ticket.stateKey} />
                    </span>
                  </Tooltip>
                  <span className="shrink-0 text-xl text-black">
                    {ticket.number}
                  </span>
                  <div className="flex min-w-0 flex-1 items-center gap-1.5">
                    <h2 className="min-w-0 truncate text-xl font-semibold text-black">
                      {ticket.title}
                    </h2>
                    {ticket.providerUrl ? (
                      <Tooltip content="Open ticket in helpdesk">
                        <a
                          aria-label="Open ticket in helpdesk"
                          className="inline-grid size-6 shrink-0 place-items-center rounded-md text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                          href={ticket.providerUrl}
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
                      {ticket.customer}
                    </span>
                  </span>
                  <span aria-hidden="true" className="mr-1.5">
                    ·
                  </span>
                  <span className="mr-1.5 inline-flex min-w-0 items-center gap-1">
                    <span>Owner:</span>
                    <span className="min-w-0 truncate font-semibold text-indigo-600">
                      {ticket.owner}
                    </span>
                  </span>
                  {ticket.createdAt ? (
                    <>
                      <span aria-hidden="true" className="mr-1.5">
                        ·
                      </span>
                      <span className="mr-1.5">
                        Created:{" "}
                        <span className="font-semibold">{ticket.createdAt}</span>
                      </span>
                    </>
                  ) : null}
                  {ticket.updatedAt ? (
                    <>
                      <span aria-hidden="true" className="mr-1.5">
                        ·
                      </span>
                      <span>
                        Updated:{" "}
                        <span className="font-semibold">{ticket.updatedAt}</span>
                      </span>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              <div
                aria-label="Loading ticket thread"
                className="rounded-md border border-slate-200 bg-white p-4"
                role="status"
              >
                <span className="sr-only">Loading ticket thread</span>
                <div className="flex items-center gap-3">
                  <div className="size-6 rounded-full bg-slate-200" />
                  <div className="h-3 w-56 rounded bg-slate-200" />
                </div>
                <div className="mt-4 space-y-2">
                  <div className="h-3 w-full max-w-3xl rounded bg-slate-100" />
                  <div className="h-3 w-11/12 max-w-2xl rounded bg-slate-100" />
                  <div className="h-3 w-2/3 max-w-xl rounded bg-slate-100" />
                </div>
              </div>
            </div>
          </section>
        </div>
        <TicketDetailSidebar>
          {["State", "Priority", "Owner", "Group", "Tags", "Links"].map((label) => (
            <section className="space-y-2" key={label}>
              <span className="block text-xs font-semibold">{label}</span>
              <div className="h-9 rounded-md border border-slate-200 bg-slate-50" />
            </section>
          ))}
        </TicketDetailSidebar>
      </div>
    </section>
  );
}
