import type { ReactNode } from "react";
import type { WorkspaceTicketDetail } from "@/features/tickets";
import { PriorityCell, StateCell } from "./ticket-table-cells";

function SidebarField({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <div className="block w-full space-y-1">
      <span className="block text-xs font-semibold">{label}</span>
      <div className="min-h-9 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
        {children}
      </div>
    </div>
  );
}

export function TicketDetailSidebar({
  detail,
}: {
  detail: WorkspaceTicketDetail;
}) {
  return (
    <aside className="w-56 shrink-0 space-y-4 border-l border-slate-200 px-3 py-3">
      <SidebarField label="State">
        <StateCell label={detail.state} state={detail.stateKey} />
      </SidebarField>
      <SidebarField label="Priority">
        <PriorityCell label={detail.priority} priority={detail.priorityKey} />
      </SidebarField>
      <SidebarField label="Group">
        <span>{detail.group}</span>
      </SidebarField>
      <SidebarField label="Pending till">
        <span>{detail.pendingTill}</span>
      </SidebarField>
      <SidebarField label="Tags">
        <span>{detail.tags.length > 0 ? detail.tags.join(", ") : "-"}</span>
      </SidebarField>
    </aside>
  );
}
