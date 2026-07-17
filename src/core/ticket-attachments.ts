export const maxTicketAttachmentDownloadBytes = 25 * 1024 * 1024;

export type TicketAttachmentLocator = {
  articleExternalId: string;
  attachmentExternalId: string;
  ticketExternalId: string;
};

export type TicketAttachmentFile = {
  bytes: Uint8Array;
  contentType: string;
  fileName: string;
};

function pathValue(value: string): string {
  return encodeURIComponent(value);
}

export function ticketAttachmentDownloadPath(
  helpdeskConnectionId: string,
  locator: TicketAttachmentLocator,
): string {
  return [
    "/api/helpdesk-connections",
    pathValue(helpdeskConnectionId),
    "tickets",
    pathValue(locator.ticketExternalId),
    "articles",
    pathValue(locator.articleExternalId),
    "attachments",
    pathValue(locator.attachmentExternalId),
  ].join("/");
}
