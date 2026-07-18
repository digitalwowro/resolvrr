import type { TicketCommunicationBodyFormat } from "@/core/tickets";
import { sanitizeComposerHtml } from "@/security/sanitize-html";
import { ticketSignatureSources } from "@/core/ticket-signatures";
import {
  isTicketCommunicationBodyFormat,
  normalizedCommunicationBody,
} from "./communication-body";
import type { SelectedTicketUpdateCommunicationPayload } from "./mutation-model";
import { customerReplyInput } from "./reply-input";
import { customerForwardInput } from "./forward-input";
import {
  hasUnsupportedKeys,
  objectValue,
  stringArrayValue,
  textValue,
} from "./metadata-action-input-values";

const internalCommentFields = ["body", "bodyFormat", "kind"] as const;
const customerReplyFields = [
  "body",
  "bodyFormat",
  "cc",
  "conversationHistoryContextVersion",
  "conversationHistoryScope",
  "contextVersion",
  "includeConversationHistory",
  "intent",
  "kind",
  "sourceArticleExternalId",
  "signatureContext",
  "to",
] as const;
const customerForwardFields = [
  "attachmentExternalIds", "body", "bodyFormat", "cc", "contextVersion",
  "conversationHistoryContextVersion", "conversationHistoryScope",
  "includeConversationHistory", "kind", "sourceArticleExternalId", "signatureContext",
  "subject", "to",
] as const;

function parsedSignatureContext(record: Record<string, unknown>) {
  if (record.signatureContext === undefined) return undefined;
  const value = objectValue(record.signatureContext);
  if (!value || hasUnsupportedKeys(value, ["contextVersion", "source"])) return null;
  const contextVersion = textValue(value, "contextVersion").trim();
  const source = textValue(value, "source");
  return contextVersion && ticketSignatureSources.includes(source as never)
    ? { contextVersion, source: source as (typeof ticketSignatureSources)[number] }
    : null;
}

export function selectedTicketCommunicationInput(value: unknown):
  | { status: "absent" }
  | { status: "invalid" }
  | { communication: SelectedTicketUpdateCommunicationPayload; status: "valid" } {
  if (value === undefined) return { status: "absent" };
  const record = objectValue(value);
  if (!record) return { status: "invalid" };
  const kind = textValue(record, "kind");
  const allowedFields = kind === "internal-comment"
    ? internalCommentFields
    : kind === "customer-reply"
      ? customerReplyFields
      : kind === "customer-forward" ? customerForwardFields : [];
  if (!allowedFields.length || hasUnsupportedKeys(record, allowedFields)) {
    return { status: "invalid" };
  }
  const bodyFormatValue = textValue(record, "bodyFormat");
  if (bodyFormatValue && !isTicketCommunicationBodyFormat(bodyFormatValue)) {
    return { status: "invalid" };
  }
  const bodyFormat: TicketCommunicationBodyFormat = bodyFormatValue === "html"
    ? "html"
    : "plain";
  const rawBody = textValue(record, "body");
  const body = normalizedCommunicationBody(
    bodyFormat === "html" ? sanitizeComposerHtml(rawBody) : rawBody,
  );
  if (!body && kind !== "customer-forward") return { status: "invalid" };
  const signatureContext = parsedSignatureContext(record);
  if (signatureContext === null) return { status: "invalid" };
  if (kind === "internal-comment") {
    return { communication: { body, bodyFormat, kind }, status: "valid" };
  }
  if (kind === "customer-forward") {
    const forward = customerForwardInput({
      attachmentExternalIds: stringArrayValue(record, "attachmentExternalIds") ?? [],
      body,
      bodyFormat,
      cc: stringArrayValue(record, "cc") ?? [],
      conversationHistoryContextVersion: textValue(
        record,
        "conversationHistoryContextVersion",
      ),
      conversationHistoryScope: textValue(
        record,
        "conversationHistoryScope",
      ),
      contextVersion: textValue(record, "contextVersion"),
      includeConversationHistory: record.includeConversationHistory === true,
      sourceArticleExternalId: textValue(record, "sourceArticleExternalId"),
      signatureContext,
      subject: textValue(record, "subject"),
      to: stringArrayValue(record, "to") ?? [],
    });
    return forward
      ? { communication: { ...forward, kind }, status: "valid" }
      : { status: "invalid" };
  }
  const reply = customerReplyInput({
    body,
    bodyFormat,
    cc: stringArrayValue(record, "cc") ?? [],
    conversationHistoryContextVersion: textValue(
      record,
      "conversationHistoryContextVersion",
    ),
    conversationHistoryScope: textValue(
      record,
      "conversationHistoryScope",
    ),
    contextVersion: textValue(record, "contextVersion"),
    includeConversationHistory: record.includeConversationHistory === true,
    intent: textValue(record, "intent"),
    sourceArticleExternalId: textValue(record, "sourceArticleExternalId"),
    signatureContext,
    to: stringArrayValue(record, "to") ?? [],
  });
  return reply
    ? { communication: { ...reply, kind: "customer-reply" }, status: "valid" }
    : { status: "invalid" };
}
