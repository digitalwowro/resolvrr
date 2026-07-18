import type { TicketCommunicationBodyFormat } from "./tickets";
import type {
  ResolvedTicketSignature,
  TicketSignatureSelection,
} from "./ticket-signatures";
import type {
  TicketConversationHistoryContext,
  TicketConversationHistoryScope,
} from "./ticket-conversation-history";

export type TicketArticleForwardContext = {
  channel: "email";
  conversationHistory?: TicketConversationHistoryContext;
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
  conversationHistoryContextVersion?: string;
  conversationHistoryScope?: TicketConversationHistoryScope;
  contextVersion: string;
  includeConversationHistory: boolean;
  sourceArticleExternalId: string;
  signatureContext?: TicketSignatureSelection;
  subject: string;
  to: string[];
};
