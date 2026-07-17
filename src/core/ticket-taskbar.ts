import type { TicketExternalId } from "./tickets";

export type TicketTaskbarItem = {
  active: boolean;
  position: number;
  ticketExternalId: TicketExternalId;
  updatedAt: Date;
};

export type TicketTaskbarSnapshot = {
  activeSelectionReliable: boolean;
  contractVersion: string;
  items: TicketTaskbarItem[];
};

export type TicketTaskbarCommand =
  | { kind: "open"; ticketExternalId: TicketExternalId }
  | { kind: "close"; ticketExternalId: TicketExternalId }
  | { kind: "activate"; ticketExternalId: TicketExternalId }
  | { kind: "deactivate" }
  | { kind: "reorder"; ticketExternalIds: TicketExternalId[] };

export type TicketTaskbarSyncResult = {
  snapshot: TicketTaskbarSnapshot;
  confirmedCommandIndexes: number[];
};

export function orderTicketTaskbarOperations<
  T extends { command: TicketTaskbarCommand },
>(operations: T[]): T[] {
  return [
    ...operations.filter((operation) => operation.command.kind !== "reorder"),
    ...operations.filter((operation) => operation.command.kind === "reorder"),
  ];
}

export function ticketTaskbarCommandIsSatisfied(
  command: TicketTaskbarCommand,
  snapshot: TicketTaskbarSnapshot,
) {
  const items = [...snapshot.items].sort(
    (left, right) => left.position - right.position,
  );
  if (command.kind === "open") {
    return items.some((item) =>
      item.ticketExternalId === command.ticketExternalId
    );
  }
  if (command.kind === "close") {
    return items.every((item) =>
      item.ticketExternalId !== command.ticketExternalId
    );
  }
  if (command.kind === "activate") {
    return items.some((item) =>
      item.ticketExternalId === command.ticketExternalId && item.active
    ) && items.every((item) =>
      item.ticketExternalId === command.ticketExternalId || !item.active
    );
  }
  if (command.kind === "deactivate") {
    return items.every((item) => !item.active);
  }
  const actualIds = items.map((item) => item.ticketExternalId);
  if (!command.ticketExternalIds.every((id) => actualIds.includes(id))) {
    return false;
  }
  return command.ticketExternalIds.every(
    (id, index) => actualIds[index] === id,
  );
}
