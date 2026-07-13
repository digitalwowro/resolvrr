import type { TicketCommunicationBodyFormat } from "@/core/tickets";
import { sanitizeComposerHtml } from "@/security/sanitize-html";
import {
  isTicketCommunicationBodyFormat,
  normalizedCommunicationBody,
} from "./communication-body";
import type { SelectedTicketUpdateCommunicationPayload } from "./mutation-model";
import { customerReplyInput } from "./reply-input";
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
  "contextVersion",
  "intent",
  "kind",
  "sourceArticleExternalId",
  "to",
] as const;

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
    : kind === "customer-reply" ? customerReplyFields : [];
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
  if (!body) return { status: "invalid" };
  if (kind === "internal-comment") {
    return { communication: { body, bodyFormat, kind }, status: "valid" };
  }
  const reply = customerReplyInput({
    body,
    bodyFormat,
    cc: stringArrayValue(record, "cc") ?? [],
    contextVersion: textValue(record, "contextVersion"),
    intent: textValue(record, "intent"),
    sourceArticleExternalId: textValue(record, "sourceArticleExternalId"),
    to: stringArrayValue(record, "to") ?? [],
  });
  return reply
    ? { communication: { ...reply, kind: "customer-reply" }, status: "valid" }
    : { status: "invalid" };
}
