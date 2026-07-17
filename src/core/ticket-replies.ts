import type {
  ResolvedTicketSignature,
  TicketSignatureSelection,
} from "./ticket-signatures";

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
  contextVersion: string;
  defaults: {
    reply: TicketReplyRecipients;
    replyAll?: TicketReplyRecipients;
  };
  sourceArticleExternalId: string;
};

export type TicketReplyPolicy = {
  providerManagedAddresses: string[];
};

export type TicketCustomerReplyInput = {
  body: string;
  bodyFormat?: "plain" | "html";
  cc: string[];
  contextVersion: string;
  intent: TicketReplyIntent;
  sourceArticleExternalId: string;
  signatureContext?: TicketSignatureSelection;
  to: string[];
};

export type ProviderTicketCustomerReplyInput = TicketCustomerReplyInput & {
  resolvedSignature?: ResolvedTicketSignature;
};
