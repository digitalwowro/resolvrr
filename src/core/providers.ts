import type { HelpdeskConnection } from "./helpdesk-connections";
import type { SavedViewFilter } from "./saved-views";
import type {
  TicketMetadataMutationInput,
  TicketDetail,
  TicketExternalId,
  TicketListItem,
} from "./tickets";

export type ProviderCapability =
  | "ticket:list"
  | "ticket:count"
  | "ticket:detail"
  | "ticket:links"
  | "ticket:subscription"
  | "ticket:update-state"
  | "ticket:update-priority"
  | "lookup:assignable-users"
  | "lookup:groups"
  | "search:full-text";

export type ProviderErrorKind =
  | "credential-auth-failure"
  | "permission-denied"
  | "rate-limited"
  | "temporary-provider-failure"
  | "unsupported-capability"
  | "validation-failure"
  | "provider-data-mismatch";

export class ProviderError extends Error {
  readonly kind: ProviderErrorKind;
  readonly retryable: boolean;
  readonly statusCode?: number;
  readonly diagnosticCode?: string;

  constructor(
    kind: ProviderErrorKind,
    message: string,
    retryable = false,
    statusCode?: number,
    diagnosticCode?: string,
  ) {
    super(message);
    this.name = "ProviderError";
    this.kind = kind;
    this.retryable = retryable;
    this.statusCode = statusCode;
    this.diagnosticCode = diagnosticCode;
  }
}

export type ProviderCredentialField = {
  name: string;
  label: string;
  type: "text" | "password" | "url";
  required: boolean;
};

export type ProviderCredentialScheme = {
  key: string;
  label: string;
  fields: ProviderCredentialField[];
};

export type ProviderConnectionInput = {
  baseUrl: string;
  validatedAddresses: string[];
  credentialScheme: string;
  credentialPayload: unknown;
  timeoutMs?: number;
};

export type ProviderContext = {
  connection: HelpdeskConnection;
  credentialScheme: string;
  credentialPayload: unknown;
  requestSecurity: {
    validatedAddresses: string[];
  };
};

export type TicketListQuery = {
  filter: SavedViewFilter;
  cursor?: string;
  limit: number;
  sort?: TicketSort;
};

export type TicketListResult = {
  tickets: TicketListItem[];
  nextCursor?: string;
  measuredAt: Date;
};

export type TicketSortKey =
  | "number"
  | "created_at"
  | "updated_at"
  | "pending_until"
  | "state"
  | "priority";

export type TicketSortDirection = "ascending" | "descending";

export type TicketSort = {
  key: TicketSortKey;
  direction: TicketSortDirection;
};

export type ProviderLookupOption = {
  externalId: string;
  label: string;
};

export type HelpdeskProviderPlugin = {
  key: string;
  label: string;
  capabilities: ProviderCapability[];
  credentialSchemes: ProviderCredentialScheme[];
  validateConnection(input: ProviderConnectionInput): Promise<void>;
  listTickets?(
    context: ProviderContext,
    query: TicketListQuery,
  ): Promise<TicketListResult>;
  countTickets?(
    context: ProviderContext,
    filter: SavedViewFilter,
  ): Promise<number>;
  getTicketDetail?(
    context: ProviderContext,
    ticketExternalId: TicketExternalId,
  ): Promise<TicketDetail>;
  updateTicketMetadata?(
    context: ProviderContext,
    ticketExternalId: TicketExternalId,
    input: TicketMetadataMutationInput,
  ): Promise<void>;
  listAssignableUsers?(context: ProviderContext): Promise<ProviderLookupOption[]>;
  listGroups?(context: ProviderContext): Promise<ProviderLookupOption[]>;
};
