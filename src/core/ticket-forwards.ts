import type { TicketCommunicationBodyFormat } from "./tickets";

export type TicketArticleForwardContext = {
  channel: "email";
  contextVersion: string;
  sourceArticleExternalId: string;
  subject: string;
};

export type TicketCustomerForwardInput = {
  attachmentExternalIds: string[];
  body: string;
  bodyFormat?: TicketCommunicationBodyFormat;
  cc: string[];
  contextVersion: string;
  includeOriginal: boolean;
  sourceArticleExternalId: string;
  subject: string;
  to: string[];
};
