import type { ReactNode } from "react";
import type { WorkspaceTicketDetail } from "@/features/tickets/workspace-adapter";
import { TicketLookupOptions } from "./ticket-lookup-options";
import { SidebarField } from "./ticket-sidebar-field";

function subscriptionLabel(detail: WorkspaceTicketDetail) {
  if (!detail.subscription.supported) {
    return "Unavailable";
  }
  return detail.subscription.following ? "Following" : "Not following";
}

function directionLabel(direction: WorkspaceTicketDetail["links"][number]["direction"]) {
  if (direction === "parent") {
    return "Parent";
  }
  if (direction === "child") {
    return "Child";
  }
  return "Related";
}

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
      <SidebarField label="Owner">
        <span>{detail.owner}</span>
      </SidebarField>
      <SidebarField label="Group">
        <span>{detail.group}</span>
      </SidebarField>
      <SidebarField label="Owner options">
        <TicketLookupOptions lookup={detail.lookupData.assignableUsers} />
      </SidebarField>
      <SidebarField label="Group options">
        <TicketLookupOptions lookup={detail.lookupData.groups} />
      </SidebarField>
      <SidebarField label="Pending till">
        <span>{detail.pendingTill}</span>
      </SidebarField>
      <SidebarField label="Subscribed">
        <span>{subscriptionLabel(detail)}</span>
      </SidebarField>
      <SidebarField label="Tags">
        <span>{detail.tags.length > 0 ? detail.tags.join(", ") : "-"}</span>
      </SidebarField>
      <SidebarField label="Links">
        {detail.links.length > 0 ? (
          <ul className="space-y-1">
            {detail.links.map((link) => (
              <li key={`${link.direction}-${link.id}`}>
                <span className="text-slate-500">{directionLabel(link.direction)}: </span>
                {link.providerUrl ? (
                  <a href={link.providerUrl} rel="noreferrer" target="_blank">
                    {link.label}
                  </a>
                ) : (
                  <span>{link.label}</span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <span>No links yet</span>
        )}
      </SidebarField>
    </aside>
  );
}
