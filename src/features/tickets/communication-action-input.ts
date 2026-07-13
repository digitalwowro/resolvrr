import type { TicketInternalNoteInput } from "@/core/tickets";
import type { TicketCustomerReplyInput } from "@/core/ticket-replies";
import { sanitizeComposerHtml } from "@/security/sanitize-html";
import { isTicketCommunicationBodyFormat, normalizedCommunicationBody } from "./communication-body";
import { customerReplyInput } from "./reply-input";

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

function stringListValue(
  record: Record<string, unknown>,
  name: string,
): string[] | undefined {
  const value = record[name];
  return Array.isArray(value) && value.every((entry) => typeof entry === "string")
    ? value
    : undefined;
}

function hasUnsupportedKeys(
  record: Record<string, unknown>,
  allowedKeys: readonly string[],
): boolean {
  return Object.keys(record).some((key) => !allowedKeys.includes(key));
}

function ticketBodyActionInput(
  request: unknown,
): { input: TicketInternalNoteInput; status: "valid"; ticketExternalId: string } | {
  status: "invalid";
} {
  const requestRecord = objectValue(request);
  if (
    !requestRecord ||
    hasUnsupportedKeys(requestRecord, ["body", "bodyFormat", "ticketExternalId"])
  ) {
    return { status: "invalid" };
  }

  const ticketExternalId = textValue(requestRecord, "ticketExternalId").trim();
  const bodyFormatValue = textValue(requestRecord, "bodyFormat");
  if (bodyFormatValue && !isTicketCommunicationBodyFormat(bodyFormatValue)) {
    return { status: "invalid" };
  }
  const bodyFormat = bodyFormatValue === "html" ? "html" : "plain";
  const rawBody = textValue(requestRecord, "body");
  const body = normalizedCommunicationBody(
    bodyFormat === "html" ? sanitizeComposerHtml(rawBody) : rawBody,
  );
  if (!ticketExternalId || !body) {
    return { status: "invalid" };
  }

  return {
    input: { body, bodyFormat },
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
  const record = objectValue(request);
  if (
    !record ||
    hasUnsupportedKeys(record, [
      "body",
      "bodyFormat",
      "cc",
      "contextVersion",
      "intent",
      "sourceArticleExternalId",
      "ticketExternalId",
      "to",
    ])
  ) {
    return { status: "invalid" };
  }
  const ticketExternalId = textValue(record, "ticketExternalId").trim();
  const bodyFormatValue = textValue(record, "bodyFormat");
  if (bodyFormatValue && !isTicketCommunicationBodyFormat(bodyFormatValue)) {
    return { status: "invalid" };
  }
  const bodyFormat = bodyFormatValue === "html" ? "html" : "plain";
  const rawBody = textValue(record, "body");
  const input = customerReplyInput({
    body: normalizedCommunicationBody(
      bodyFormat === "html" ? sanitizeComposerHtml(rawBody) : rawBody,
    ),
    bodyFormat,
    cc: stringListValue(record, "cc") ?? [],
    contextVersion: textValue(record, "contextVersion"),
    intent: textValue(record, "intent"),
    sourceArticleExternalId: textValue(record, "sourceArticleExternalId"),
    to: stringListValue(record, "to") ?? [],
  });
  return ticketExternalId && input
    ? { status: "valid", ticketExternalId, input }
    : { status: "invalid" };
}
