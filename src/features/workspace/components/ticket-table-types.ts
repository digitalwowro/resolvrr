import type { WorkspaceTicketRow } from "@/features/tickets/workspace-adapter";

export type TicketTableGroup = {
  id: string;
  label: string;
  value: string;
  rows: WorkspaceTicketRow[];
  loadedCount?: number;
  totalCount?: number;
  nextCursor?: string;
};
