"use client";

import { Building2, ExternalLink, UserRound } from "lucide-react";
import { Tooltip } from "@/components/ui";
import type {
  WorkspaceTicketRow,
  WorkspaceTicketTab,
} from "@/features/tickets/workspace-adapter";
import { TicketDetailSidebar } from "./ticket-detail-sidebar";
import { TicketPriorityDot } from "./ticket-priority-dot";
import { TicketStateBadge } from "./ticket-state-badge";

type TicketDetailLoadingSummary = WorkspaceTicketTab &
  Partial<Pick<WorkspaceTicketRow, "createdAt" | "providerUrl" | "updatedAt">>;

export function TicketDetailLoadingShell({
  ticket,
}: {
  roundedTop?: boolean;
  ticket: TicketDetailLoadingSummary;
}) {
  return (
    <section
      aria-label={`Ticket detail ${ticket.number}`}
      className="flex min-h-0 flex-1 bg-white"
    >
      <section
        aria-label="Ticket conversation"
        className="ticket-detail-scroll min-w-0 flex-1 overflow-y-auto"
      >
        <div className="py-4 pl-4 pr-0">
          <div className="space-y-2">
            <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs text-slate-600">
              <Tooltip content={`Priority: ${ticket.priority}`} side="bottom">
                <TicketPriorityDot
                  priority={ticket.priorityKey}
                  priorityLabel={ticket.priority}
                />
              </Tooltip>
              <span className="shrink-0 text-sm font-medium text-slate-950">
                {ticket.number}
              </span>
              <TicketStateBadge label={ticket.state} state={ticket.stateKey} />
              {ticket.createdAt ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="shrink-0">Created {ticket.createdAt}</span>
                </>
              ) : null}
              {ticket.updatedAt ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="shrink-0">Updated {ticket.updatedAt}</span>
                </>
              ) : null}
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <h2 className="min-w-0 truncate text-xl font-semibold text-black">
                {ticket.title}
              </h2>
              {ticket.providerUrl ? (
                <Tooltip content="Open ticket in helpdesk">
                  <a
                    aria-label="Open ticket in helpdesk"
                    className="inline-grid size-6 shrink-0 place-items-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                    href={ticket.providerUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <ExternalLink aria-hidden="true" className="size-3.5" />
                  </a>
                </Tooltip>
              ) : null}
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-700">
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <UserRound
                  aria-hidden="true"
                  className="size-3.5 shrink-0 text-slate-500"
                />
                <span className="min-w-0 truncate">{ticket.customer}</span>
              </span>
              {ticket.customerOrganization ? (
                <span
                  aria-label={`Customer organization: ${ticket.customerOrganization}`}
                  className="inline-flex min-w-0 items-center gap-1.5"
                >
                  <Building2
                    aria-hidden="true"
                    className="size-3.5 shrink-0 text-slate-500"
                  />
                  <span className="min-w-0 truncate">
                    {ticket.customerOrganization}
                  </span>
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <div className="py-4 pl-4 pr-0">
          <div aria-label="Loading ticket thread" role="status">
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
      <TicketDetailSidebar>
        {["State", "Priority", "Owner", "Group", "Tags", "Links"].map((label) => (
          <section className="space-y-2" key={label}>
            <span className="block text-xs font-semibold">{label}</span>
            <div className="h-9 rounded-md border border-slate-200 bg-slate-50" />
          </section>
        ))}
      </TicketDetailSidebar>
    </section>
  );
}
