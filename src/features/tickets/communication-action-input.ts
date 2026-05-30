import type { TicketInternalNoteInput } from "@/core/tickets";

export type TicketInternalNoteActionInput =
  | {
      input: TicketInternalNoteInput;
      status: "valid";
      ticketExternalId: string;
    }
  | {
      status: "invalid";
    };

function objectValue(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function textValue(record: Record<string, unknown>, name: string): string {
  const value = record[name];
  return typeof value === "string" ? value : "";
}

function hasUnsupportedKeys(
  record: Record<string, unknown>,
  allowedKeys: readonly string[],
): boolean {
  return Object.keys(record).some((key) => !allowedKeys.includes(key));
}

export function ticketInternalNoteActionInput(
  request: unknown,
): TicketInternalNoteActionInput {
  const requestRecord = objectValue(request);
  if (
    !requestRecord ||
    hasUnsupportedKeys(requestRecord, ["body", "ticketExternalId"])
  ) {
    return { status: "invalid" };
  }

  const ticketExternalId = textValue(requestRecord, "ticketExternalId").trim();
  const body = textValue(requestRecord, "body").trim();
  if (!ticketExternalId || !body) {
    return { status: "invalid" };
  }

  return {
    input: { body },
    status: "valid",
    ticketExternalId,
  };
}
