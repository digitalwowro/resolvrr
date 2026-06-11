import type { WorkspaceTicketListGroup } from "@/features/tickets/list-page-action-result";
import type { WorkspaceTicketRow } from "@/features/tickets/workspace-adapter";

export function normalizedWorkspaceSearch(query: string) {
  return query.trim().toLocaleLowerCase();
}

function ticketMatchesWorkspaceSearch(
  ticket: WorkspaceTicketRow,
  normalizedQuery: string,
) {
  return [
    ticket.number,
    ticket.title,
    ticket.customer,
    ticket.owner,
    ticket.group,
    ticket.state,
    ticket.priority,
  ].some((value) => value.toLocaleLowerCase().includes(normalizedQuery));
}

export function filterLoadedTickets(
  rows: WorkspaceTicketRow[],
  normalizedQuery: string,
) {
  if (!normalizedQuery) {
    return rows;
  }

  return rows.filter((row) =>
    ticketMatchesWorkspaceSearch(row, normalizedQuery),
  );
}

export function filterLoadedTicketGroups(
  groups: WorkspaceTicketListGroup[] | undefined,
  normalizedQuery: string,
) {
  if (!groups || !normalizedQuery) {
    return groups;
  }

  return groups.flatMap((group) => {
    const rows = filterLoadedTickets(group.rows, normalizedQuery);
    return rows.length > 0
      ? [
          {
            id: group.id,
            key: group.key,
            label: group.label,
            value: group.value,
            rows,
            loadedCount: rows.length,
          },
        ]
      : [];
  });
}
