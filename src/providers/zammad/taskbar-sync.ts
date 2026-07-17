import type {
  TicketTaskbarCommand,
  TicketTaskbarSnapshot,
  TicketTaskbarSyncResult,
} from "@/core/ticket-taskbar";
import { ProviderError, type ProviderContext } from "@/core/providers";
import { zammadGetJson, zammadSendJson } from "./client";
import { readZammadTicketForMutation } from "./ticket-mutation-preflight";
import { zammadTicketId } from "./ticket-id";
import {
  parseZammadTaskbar,
  taskbarTicketId,
  type ZammadTaskbarItem,
} from "./taskbar-schema";

const taskbarContractVersion = "zammad-6.5-rest-taskbar-v1";

async function readRaw(context: ProviderContext): Promise<ZammadTaskbarItem[]> {
  try {
    return parseZammadTaskbar(await zammadGetJson(context, "/api/v1/taskbar"));
  } catch (error) {
    if (error instanceof ProviderError && error.kind === "provider-data-mismatch") {
      throw new ProviderError(
        error.kind,
        "The helpdesk taskbar contract is not compatible with this Zammad version.",
        false,
        error.statusCode,
        error.diagnosticCode ?? "taskbar-contract-unavailable",
      );
    }
    throw error;
  }
}

function ticketItems(items: ZammadTaskbarItem[]) {
  const tickets = items.flatMap((item) => {
    const ticketId = taskbarTicketId(item);
    return ticketId === null ? [] : [{ item, ticketId }];
  });
  if (new Set(tickets.map(({ ticketId }) => ticketId)).size !== tickets.length) {
    throw new ProviderError(
      "provider-data-mismatch",
      "The helpdesk taskbar contains duplicate ticket tasks.",
      false,
      undefined,
      "taskbar-contract-duplicate-ticket",
    );
  }
  return tickets;
}

function snapshot(items: ZammadTaskbarItem[]): TicketTaskbarSnapshot {
  const tickets = ticketItems(items);
  const activeItems = items.filter((item) => item.active);
  return {
    activeSelectionReliable:
      activeItems.length === 1 && taskbarTicketId(activeItems[0]!) !== null,
    contractVersion: taskbarContractVersion,
    items: tickets
      .sort((left, right) => left.item.prio - right.item.prio)
      .map(({ item, ticketId }, position) => ({
        active: item.active,
        position,
        ticketExternalId: String(ticketId),
        updatedAt: item.updated_at,
      })),
  };
}

async function openTicket(
  context: ProviderContext,
  items: ZammadTaskbarItem[],
  ticketExternalId: string,
): Promise<void> {
  const ticketId = zammadTicketId(ticketExternalId);
  if (ticketItems(items).some((entry) => entry.ticketId === ticketId)) return;
  await readZammadTicketForMutation(context, ticketExternalId);
  const highestPriority = items.reduce((value, item) => Math.max(value, item.prio), 0);
  await zammadSendJson(context, "/api/v1/taskbar", "POST", {
    active: false,
    app: "desktop",
    callback: "TicketZoom",
    key: `Ticket-${ticketId}`,
    notify: false,
    params: { ticket_id: ticketId },
    prio: highestPriority + 1,
    state: {},
  });
}

async function closeTicket(
  context: ProviderContext,
  items: ZammadTaskbarItem[],
  ticketExternalId: string,
): Promise<void> {
  const ticketId = zammadTicketId(ticketExternalId);
  const match = ticketItems(items).find((entry) => entry.ticketId === ticketId);
  if (!match) return;
  await zammadSendJson(
    context,
    `/api/v1/taskbar/${encodeURIComponent(String(match.item.id))}`,
    "DELETE",
    {},
  );
}

async function activateTicket(
  context: ProviderContext,
  items: ZammadTaskbarItem[],
  ticketExternalId: string,
): Promise<void> {
  const ticketId = zammadTicketId(ticketExternalId);
  let currentItems = items;
  if (!ticketItems(currentItems).some((entry) => entry.ticketId === ticketId)) {
    await openTicket(context, currentItems, ticketExternalId);
    currentItems = await readRaw(context);
  }
  const tickets = ticketItems(currentItems);
  for (const { item, ticketId: currentTicketId } of tickets) {
    if (!item.active || currentTicketId === ticketId) continue;
    await zammadSendJson(
      context,
      `/api/v1/taskbar/${encodeURIComponent(String(item.id))}`,
      "PUT",
      { active: false },
    );
  }
  const target = tickets.find((entry) => entry.ticketId === ticketId);
  if (target && !target.item.active) {
    await zammadSendJson(
      context,
      `/api/v1/taskbar/${encodeURIComponent(String(target.item.id))}`,
      "PUT",
      { active: true },
    );
  }
}

async function deactivateTickets(
  context: ProviderContext,
  items: ZammadTaskbarItem[],
): Promise<void> {
  for (const { item } of ticketItems(items)) {
    if (!item.active) continue;
    await zammadSendJson(
      context,
      `/api/v1/taskbar/${encodeURIComponent(String(item.id))}`,
      "PUT",
      { active: false },
    );
  }
}

async function reorderTickets(
  context: ProviderContext,
  items: ZammadTaskbarItem[],
  ticketExternalIds: string[],
): Promise<void> {
  const existing = ticketItems(items);
  const requested = [...new Set(ticketExternalIds.map(zammadTicketId))];
  const ordered = [
    ...requested.flatMap((id) => existing.filter((entry) => entry.ticketId === id)),
    ...existing.filter((entry) => !requested.includes(entry.ticketId)),
  ];
  const prioritySlots = existing.map((entry) => entry.item.prio).sort((a, b) => a - b);
  for (const [index, entry] of ordered.entries()) {
    const prio = prioritySlots[index];
    if (prio === undefined || entry.item.prio === prio) continue;
    await zammadSendJson(
      context,
      `/api/v1/taskbar/${encodeURIComponent(String(entry.item.id))}`,
      "PUT",
      { prio },
    );
  }
}

function commandSatisfied(
  command: TicketTaskbarCommand,
  before: ZammadTaskbarItem[],
  after: ZammadTaskbarItem[],
) {
  const afterTickets = ticketItems(after);
  if (command.kind === "open") {
    const ticketId = zammadTicketId(command.ticketExternalId);
    return afterTickets.some((entry) => entry.ticketId === ticketId);
  }
  if (command.kind === "close") {
    const ticketId = zammadTicketId(command.ticketExternalId);
    return !afterTickets.some((entry) => entry.ticketId === ticketId);
  }
  if (command.kind === "activate") {
    const ticketId = zammadTicketId(command.ticketExternalId);
    return afterTickets.some((entry) =>
      entry.ticketId === ticketId && entry.item.active
    ) && afterTickets.every((entry) =>
      entry.ticketId === ticketId || !entry.item.active
    );
  }
  if (command.kind === "deactivate") {
    return afterTickets.every((entry) => !entry.item.active);
  }
  const beforeIds = ticketItems(before)
    .sort((left, right) => left.item.prio - right.item.prio)
    .map((entry) => entry.ticketId);
  const requested = [...new Set(command.ticketExternalIds.map(zammadTicketId))];
  if (!requested.every((id) => beforeIds.includes(id))) return false;
  const expected = [
    ...requested,
    ...beforeIds.filter((id) => !requested.includes(id)),
  ];
  const actual = afterTickets
    .sort((left, right) => left.item.prio - right.item.prio)
    .map((entry) => entry.ticketId);
  return expected.length === actual.length &&
    expected.every((id, index) => id === actual[index]);
}

function unconfirmedCommand(): ProviderError {
  return new ProviderError(
    "temporary-provider-failure",
    "The helpdesk did not confirm the requested ticket taskbar change.",
    true,
    undefined,
    "taskbar-command-unconfirmed",
  );
}

export async function readZammadTicketTaskbar(
  context: ProviderContext,
): Promise<TicketTaskbarSnapshot> {
  return snapshot(await readRaw(context));
}

export async function syncZammadTicketTaskbar(
  context: ProviderContext,
  commands: TicketTaskbarCommand[],
): Promise<TicketTaskbarSyncResult> {
  const confirmedCommandIndexes: number[] = [];
  let items = await readRaw(context);
  for (const [index, command] of commands.entries()) {
    const before = items;
    if (command.kind === "open") await openTicket(context, items, command.ticketExternalId);
    if (command.kind === "close") await closeTicket(context, items, command.ticketExternalId);
    if (command.kind === "activate") await activateTicket(context, items, command.ticketExternalId);
    if (command.kind === "deactivate") await deactivateTickets(context, items);
    if (command.kind === "reorder") await reorderTickets(context, items, command.ticketExternalIds);
    items = await readRaw(context);
    if (!commandSatisfied(command, before, items)) throw unconfirmedCommand();
    confirmedCommandIndexes.push(index);
  }
  return {
    confirmedCommandIndexes,
    snapshot: snapshot(items),
  };
}
