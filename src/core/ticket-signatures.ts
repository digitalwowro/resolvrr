export const ticketSignatureSources = [
  "none",
  "zammad",
  "resolvrr",
] as const;

export type TicketSignatureSource = (typeof ticketSignatureSources)[number];

export type TicketSignatureContext = {
  contextVersion: string;
  renderedHtml?: string;
  source: TicketSignatureSource;
};

export type TicketSignatureSelection = Pick<
  TicketSignatureContext,
  "contextVersion" | "source"
>;

export type ProviderTicketSignatureRequest = {
  groupExternalId?: string;
  ticketExternalId: string;
};

export type ProviderTicketSignature = {
  contextVersion: string;
  renderedHtml?: string;
};

export type ResolvedTicketSignature = TicketSignatureContext;
