import type { TicketCommunicationBodyFormat } from "./tickets";
import type {
  ResolvedTicketSignature,
  TicketSignatureSelection,
} from "./ticket-signatures";

export type TicketArticleForwardContext = {
  channel: "email";
  contextVersion: string;
  sourceArticleExternalId: string;
  signatureContext?: TicketSignatureSelection;
  subject: string;
};

export type ProviderTicketCustomerForwardInput = TicketCustomerForwardInput & {
  resolvedSignature?: ResolvedTicketSignature;
};

export type TicketCustomerForwardInput = {
  attachmentExternalIds: string[];
  body: string;
  bodyFormat?: TicketCommunicationBodyFormat;
  cc: string[];
  contextVersion: string;
  includeOriginal: boolean;
  sourceArticleExternalId: string;
  signatureContext?: TicketSignatureSelection;
  subject: string;
  to: string[];
};
