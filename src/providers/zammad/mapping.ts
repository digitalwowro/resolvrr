import type { TicketPriority, TicketState } from "@/core/tickets";

const stateMap = new Map<string, TicketState>([
  ["new", "new"],
  ["open", "open"],
  ["pending reminder", "pending_reminder"],
  ["pending close", "pending_close"],
  ["closed", "closed"],
]);

const priorityMap = new Map<string, TicketPriority>([
  ["1 low", "low"],
  ["2 normal", "medium"],
  ["3 high", "high"],
]);

export function mapState(rawState: string | undefined): TicketState | undefined {
  if (!rawState) {
    return undefined;
  }

  return stateMap.get(rawState.toLowerCase());
}

export function mapPriority(
  rawPriority: string | undefined,
): TicketPriority | undefined {
  if (!rawPriority) {
    return undefined;
  }

  return priorityMap.get(rawPriority.toLowerCase());
}
