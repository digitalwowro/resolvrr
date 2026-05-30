import type {
  TicketCustomerReplyInput,
  TicketInternalNoteInput,
} from "@/core/tickets";

export type TicketInternalNoteActionInput =
  | {
      input: TicketInternalNoteInput;
      status: "valid";
      ticketExternalId: string;
    }
  | {
      status: "invalid";
    };

export type TicketCustomerReplyActionInput =
  | {
      input: TicketCustomerReplyInput;
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

function ticketBodyActionInput(
  request: unknown,
): { input: { body: string }; status: "valid"; ticketExternalId: string } | {
  status: "invalid";
} {
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

export function ticketInternalNoteActionInput(
  request: unknown,
): TicketInternalNoteActionInput {
  return ticketBodyActionInput(request);
}

export function ticketCustomerReplyActionInput(
  request: unknown,
): TicketCustomerReplyActionInput {
  return ticketBodyActionInput(request);
}
