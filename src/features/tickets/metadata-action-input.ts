import {
  ticketPriorities,
  ticketStates,
  type TicketMetadataMutationInput,
  type TicketPriority,
  type TicketState,
} from "@/core/tickets";
import type { TicketMetadataMutationField } from "./mutation-model";

export type TicketMetadataMutationActionInput =
  | {
      field: TicketMetadataMutationField;
      input: TicketMetadataMutationInput;
      status: "valid";
      ticketExternalId: string;
    }
  | {
      field: TicketMetadataMutationField;
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

function hasOwnValue(record: Record<string, unknown>, name: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, name);
}

function isTicketState(value: string): value is TicketState {
  return ticketStates.includes(value as TicketState);
}

function isTicketPriority(value: string): value is TicketPriority {
  return ticketPriorities.includes(value as TicketPriority);
}

function isPendingState(state: TicketState | undefined): boolean {
  return state === "pending_reminder" || state === "pending_close";
}

function pendingUntilValue(value: string): Date | undefined {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : undefined;
}

function invalidField(
  stateValue: string,
  priorityValue: string,
): TicketMetadataMutationField {
  return stateValue || !priorityValue ? "state" : "priority";
}

export function ticketMetadataMutationActionInput(
  request: unknown,
  now = new Date(),
): TicketMetadataMutationActionInput {
  const requestRecord = objectValue(request);
  const metadata = objectValue(requestRecord?.metadata) ?? {};
  const ticketExternalId = requestRecord
    ? textValue(requestRecord, "ticketExternalId")
    : "";
  const stateValue = textValue(metadata, "state");
  const priorityValue = textValue(metadata, "priority");
  const pendingUntilText = textValue(metadata, "pendingUntil");
  const input: TicketMetadataMutationInput = {};
  let field: TicketMetadataMutationField | undefined;

  if (hasOwnValue(metadata, "state") && !stateValue) {
    return { status: "invalid", field: "state" };
  }
  if (stateValue) {
    if (!isTicketState(stateValue)) {
      return { status: "invalid", field: "state" };
    }
    input.state = stateValue;
    field = "state";
  }

  if (hasOwnValue(metadata, "priority") && !priorityValue) {
    return { status: "invalid", field: "priority" };
  }
  if (priorityValue) {
    if (!isTicketPriority(priorityValue)) {
      return { status: "invalid", field: "priority" };
    }
    input.priority = priorityValue;
    field = field ?? "priority";
  }

  if (hasOwnValue(metadata, "pendingUntil") && !pendingUntilText) {
    return { status: "invalid", field: "state" };
  }
  if (pendingUntilText) {
    const pendingUntil = pendingUntilValue(pendingUntilText);
    if (
      !input.state ||
      !isPendingState(input.state) ||
      !pendingUntil ||
      pendingUntil.getTime() <= now.getTime()
    ) {
      return { status: "invalid", field: "state" };
    }
    input.pendingUntil = pendingUntil;
  }

  if (input.state && isPendingState(input.state) && !input.pendingUntil) {
    return { status: "invalid", field: "state" };
  }

  if (!ticketExternalId || !field) {
    return {
      status: "invalid",
      field: invalidField(stateValue, priorityValue),
    };
  }

  return {
    field,
    input,
    status: "valid",
    ticketExternalId,
  };
}
