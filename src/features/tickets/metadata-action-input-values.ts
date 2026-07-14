import {
  ticketLinkRelationKinds,
  ticketPriorities,
  ticketStates,
  type TicketLinkRelationKind,
  type TicketPriority,
  type TicketMutableState,
} from "@/core/tickets";

export function objectValue(
  value: unknown,
): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

export function textValue(
  record: Record<string, unknown>,
  name: string,
): string {
  const value = record[name];
  return typeof value === "string" ? value : "";
}

export function booleanValue(
  record: Record<string, unknown>,
  name: string,
): boolean | undefined {
  const value = record[name];
  return typeof value === "boolean" ? value : undefined;
}

export function stringArrayValue(
  record: Record<string, unknown>,
  name: string,
): string[] | undefined {
  const value = record[name];
  return Array.isArray(value) && value.every((item) => typeof item === "string")
    ? value
    : undefined;
}

export function hasOwnValue(
  record: Record<string, unknown>,
  name: string,
): boolean {
  return Object.prototype.hasOwnProperty.call(record, name);
}

export function hasUnsupportedKeys(
  record: Record<string, unknown>,
  allowedKeys: readonly string[],
): boolean {
  return Object.keys(record).some((key) => !allowedKeys.includes(key));
}

export function isTicketState(value: string): value is TicketMutableState {
  return ticketStates.includes(value as TicketMutableState);
}

export function isTicketPriority(value: string): value is TicketPriority {
  return ticketPriorities.includes(value as TicketPriority);
}

export function isTicketLinkRelationKind(
  value: string,
): value is TicketLinkRelationKind {
  return ticketLinkRelationKinds.includes(value as TicketLinkRelationKind);
}

export function normalizedTags(values: string[]): string[] {
  return [
    ...new Set(
      values
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ];
}
