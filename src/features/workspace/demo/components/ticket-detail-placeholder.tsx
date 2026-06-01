"use client";

import {
  CheckCircle2,
  Circle,
  CirclePlus,
  Clock3,
  Copy,
  ExternalLink,
  PauseCircle,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { Button, Tooltip } from "@/components/ui";
import { cn } from "@/components/ui/classnames";
import { staticTicketReplies } from "../static-fixtures";
import type { StaticTicketRow, StaticTicketState } from "../static-types";
import { TicketDetailSidebar } from "./ticket-detail-sidebar";
import { TicketThread } from "./ticket-thread";

type TicketDetailPlaceholderProps = {
  roundedTop: boolean;
  ticket: StaticTicketRow;
};

const stateClass: Record<StaticTicketState, string> = {
  New: "text-rose-600",
  Open: "text-indigo-600",
  "Pending Reminder": "text-amber-600",
  "Pending Close": "text-violet-600",
  Closed: "text-emerald-600",
};

const stateIcon: Record<StaticTicketState, LucideIcon> = {
  New: CirclePlus,
  Open: Circle,
  "Pending Reminder": Clock3,
  "Pending Close": PauseCircle,
  Closed: CheckCircle2,
};

function ticketSummaryText(ticket: StaticTicketRow) {
  return [
    `${ticket.number} ${ticket.title}`,
    `Customer: ${ticket.customer}`,
    `Owner: ${ticket.owner}`,
    `Created: ${ticket.createdAt}`,
    `Updated: ${ticket.updatedAt}`,
  ].join("\n");
}

export function TicketDetailPlaceholder({
  roundedTop,
  ticket,
}: TicketDetailPlaceholderProps) {
  const StateIcon = stateIcon[ticket.state];
  const [copied, setCopied] = useState(false);
  const replies = staticTicketReplies(ticket);

  async function copySummary() {
    await navigator.clipboard.writeText(ticketSummaryText(ticket));
    setCopied(true);
  }

  return (
    <section
      aria-label={`Ticket detail ${ticket.number}`}
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-hidden border-x border-t border-slate-200 bg-white",
        roundedTop && "rounded-t-md",
      )}
    >
      <div className="border-b border-slate-200 px-4 py-3">
        <div className="space-y-2">
          <div className="flex min-w-0 items-center gap-3">
            <StateIcon
              aria-hidden="true"
              className={cn("size-4 shrink-0", stateClass[ticket.state])}
            />
            <span className="shrink-0 text-xl text-black">{ticket.number}</span>
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              <h2 className="min-w-0 truncate text-xl font-semibold text-black">
                {ticket.title}
              </h2>
              <Tooltip content={copied ? "Copied" : "Copy ticket summary"}>
                <Button
                  aria-label="Copy ticket summary"
                  className="!size-6 !gap-0 shrink-0 justify-center !p-0"
                  icon={<Copy aria-hidden="true" className="size-3.5" />}
                  onClick={() => void copySummary()}
                  type="button"
                  variant="ghost"
                >
                  {copied ? <span className="sr-only">Copied</span> : null}
                </Button>
              </Tooltip>
              <Tooltip content="Open ticket in helpdesk">
                <Button
                  aria-label="Open ticket in helpdesk"
                  className="!size-6 !gap-0 shrink-0 justify-center !p-0"
                  icon={<ExternalLink aria-hidden="true" className="size-3.5" />}
                  onClick={() => undefined}
                  type="button"
                  variant="ghost"
                />
              </Tooltip>
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
            <span aria-hidden="true" className="mr-1.5">
              ·
            </span>
            <span className="mr-1.5">
              Created: <span className="font-semibold">{ticket.createdAt}</span>
            </span>
            <span aria-hidden="true" className="mr-1.5">
              ·
            </span>
            <span>
              Updated: <span className="font-semibold">{ticket.updatedAt}</span>
            </span>
          </div>
        </div>
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <TicketThread replies={replies} />
        </div>
        <TicketDetailSidebar ticket={ticket} />
      </div>
    </section>
  );
}
