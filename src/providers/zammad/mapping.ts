import type { TicketPriority, TicketState } from "@/core/tickets";

const stateMap = new Map<string, TicketState>([
  ["new", "New"],
  ["open", "Open"],
  ["pending reminder", "Pending Reminder"],
  ["pending close", "Pending Close"],
  ["closed", "Closed"],
]);

const priorityMap = new Map<string, TicketPriority>([
  ["1 low", "Low"],
  ["2 normal", "Medium"],
  ["3 high", "High"],
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
