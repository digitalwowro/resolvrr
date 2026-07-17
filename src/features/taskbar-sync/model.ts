import { z } from "zod";
import type { TicketReadUnavailableReason } from "@/features/tickets/read-model";

const ticketId = z.string().trim().min(1).max(128);

export const taskbarSyncRequestSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("reconcile") }).strict(),
  z.object({ kind: z.literal("open"), ticketExternalId: ticketId }).strict(),
  z.object({ kind: z.literal("close"), ticketExternalId: ticketId }).strict(),
  z.object({ kind: z.literal("activate"), ticketExternalId: ticketId }).strict(),
  z.object({ kind: z.literal("deactivate") }).strict(),
  z.object({
    kind: z.literal("reorder"),
    ticketExternalIds: z.array(ticketId).max(20).refine(
      (ids) => new Set(ids).size === ids.length,
      "Ticket IDs must be unique.",
    ),
  }).strict(),
]);

export type TaskbarSyncRequest = z.infer<typeof taskbarSyncRequestSchema>;
export type TaskbarPendingKind = Exclude<TaskbarSyncRequest["kind"], "reconcile">;

export type WorkspaceTaskbarSyncAvailable = {
  status: "available";
  activeSelectionReliable: boolean;
  initial: boolean;
  ticketExternalIds: string[];
  activeTicketExternalId?: string;
  unsynchronizedTicketExternalIds: string[];
  pendingOpenTicketExternalIds: string[];
  pendingCloseTicketExternalIds: string[];
  pendingActiveTicketExternalId?: string;
  activeNotSynchronized: boolean;
  orderNotSynchronized: boolean;
  synchronizedAt: string;
};

export type WorkspaceTaskbarSyncUnavailable = {
  status: "unavailable";
  reason: TicketReadUnavailableReason | "taskbar-incompatible";
  retryable: boolean;
  unsynchronizedTicketExternalIds: string[];
  pendingOpenTicketExternalIds: string[];
  pendingCloseTicketExternalIds: string[];
  pendingActiveTicketExternalId?: string;
  activeNotSynchronized: boolean;
  orderNotSynchronized: boolean;
};

export type WorkspaceTaskbarSyncResult =
  | WorkspaceTaskbarSyncAvailable
  | WorkspaceTaskbarSyncUnavailable;
