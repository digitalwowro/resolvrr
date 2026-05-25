import type { ReactNode } from "react";
import type { WorkspaceTicketDetail } from "@/features/tickets";
import { SidebarField } from "./ticket-sidebar-field";

export function TicketDetailSidebar({
  children,
  detail,
}: {
  children: ReactNode;
  detail: WorkspaceTicketDetail;
}) {
  return (
    <aside className="w-56 shrink-0 space-y-4 overflow-y-auto border-l border-slate-200 px-3 py-3">
      {children}
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
