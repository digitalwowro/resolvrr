import type {
  ResolvedTicketSignature,
  TicketSignatureSelection,
} from "./ticket-signatures";
import type {
  TicketConversationHistoryContext,
  TicketConversationHistoryScope,
} from "./ticket-conversation-history";

export type TicketReplyIntent = "reply" | "reply-all";

export type TicketReplyChannel = "email" | "web" | "phone";

export type TicketReplyRecipientChannel = "to" | "cc";

export type TicketReplyRecipient = {
  channel: TicketReplyRecipientChannel;
  email: string;
  name?: string;
};

export type TicketReplyRecipients = {
  cc: TicketReplyRecipient[];
  to: TicketReplyRecipient[];
};

export type TicketArticleReplyContext = {
  availableIntents: TicketReplyIntent[];
  channel: TicketReplyChannel;
  conversationHistory?: TicketConversationHistoryContext;
  contextVersion: string;
  defaults: {
    reply: TicketReplyRecipients;
    replyAll?: TicketReplyRecipients;
  };
  sourceArticleExternalId: string;
};

export type TicketReplyPolicy = {
  conversationHistory?: TicketConversationHistoryContext;
  providerManagedAddresses: string[];
};

export type TicketCustomerReplyInput = {
  body: string;
  bodyFormat?: "plain" | "html";
  cc: string[];
  conversationHistoryContextVersion?: string;
  conversationHistoryScope?: TicketConversationHistoryScope;
  contextVersion: string;
  includeConversationHistory: boolean;
  intent: TicketReplyIntent;
  sourceArticleExternalId: string;
  signatureContext?: TicketSignatureSelection;
  to: string[];
};

export type ProviderTicketCustomerReplyInput = TicketCustomerReplyInput & {
  resolvedSignature?: ResolvedTicketSignature;
};
