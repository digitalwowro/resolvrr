import sanitizeHtml from "sanitize-html";
import type { TicketCommunicationBodyFormat } from "@/core/tickets";

export const ticketCommunicationBodyFormats = ["plain", "html"] as const;

export function isTicketCommunicationBodyFormat(
  value: string,
): value is TicketCommunicationBodyFormat {
  return ticketCommunicationBodyFormats.includes(
    value as TicketCommunicationBodyFormat,
  );
}

export function communicationBodyHasText(body: string): boolean {
  return sanitizeHtml(body, {
    allowedAttributes: {},
    allowedTags: [],
    disallowedTagsMode: "discard",
  }).trim().length > 0;
}

export function normalizedCommunicationBody(body: string): string {
  const normalized = body.trim();
  return communicationBodyHasText(normalized) ? normalized : "";
}
