export const ticketInlineImageContentTypes = [
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type TicketInlineImageContentType =
  (typeof ticketInlineImageContentTypes)[number];

export type TicketInlineImageLocator = {
  articleExternalId: string;
  attachmentExternalId: string;
  ticketExternalId: string;
};

export type TicketInlineImage = {
  bytes: Uint8Array;
  contentType: TicketInlineImageContentType;
};

function pathValue(value: string): string {
  return encodeURIComponent(value);
}

export function ticketInlineImagePath(
  helpdeskConnectionId: string,
  locator: TicketInlineImageLocator,
): string {
  return [
    "/api/helpdesk-connections",
    pathValue(helpdeskConnectionId),
    "tickets",
    pathValue(locator.ticketExternalId),
    "articles",
    pathValue(locator.articleExternalId),
    "inline-images",
    pathValue(locator.attachmentExternalId),
  ].join("/");
}
