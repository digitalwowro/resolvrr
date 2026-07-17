import type { TicketLookupOption } from "./ticket-lookups";

export type TicketMentionLookupInput = {
  groupExternalId: string;
  query: string;
};

export type TicketMentionOption = TicketLookupOption;
