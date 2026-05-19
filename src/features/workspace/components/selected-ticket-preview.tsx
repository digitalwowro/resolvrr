import { StatusBadge } from "@/components/ui";
import type { StaticTicketPriority, StaticTicketRow, StaticTicketState } from "../static-types";

type SelectedTicketPreviewProps = {
  ticket: StaticTicketRow;
};

const stateTone: Record<StaticTicketState, "success" | "warning" | "danger" | "info"> = {
  open: "info",
  pending: "warning",
  escalated: "danger",
  resolved: "success",
};

const priorityTone: Record<
  StaticTicketPriority,
  "neutral" | "warning" | "danger"
> = {
  low: "neutral",
  normal: "neutral",
  high: "warning",
  urgent: "danger",
};

export function SelectedTicketPreview({ ticket }: SelectedTicketPreviewProps) {
  return (
    <aside className="w-80 shrink-0 border-l border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase text-slate-500">Selected ticket</p>
      <h2 className="mt-2 text-base font-semibold leading-6 text-slate-950">
        {ticket.ticketNumber} {ticket.subject}
      </h2>
      <div className="mt-3 flex flex-wrap gap-2">
        <StatusBadge label={ticket.state} tone={stateTone[ticket.state]} />
        <StatusBadge label={ticket.priority} tone={priorityTone[ticket.priority]} />
      </div>
      <dl className="mt-4 space-y-3 text-sm">
        <div>
          <dt className="text-xs font-medium uppercase text-slate-500">Requester</dt>
          <dd className="mt-1 text-slate-900">{ticket.requester}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase text-slate-500">Assignee</dt>
          <dd className="mt-1 text-slate-900">{ticket.assignee}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase text-slate-500">Preview</dt>
          <dd className="mt-1 leading-6 text-slate-700">{ticket.preview}</dd>
        </div>
      </dl>
    </aside>
  );
}
