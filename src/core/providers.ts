import type { HelpdeskConnection } from "./helpdesk-connections";
import type { TicketLookupOption } from "./ticket-lookups";
import type {
  TicketCustomerReplyInput,
  TicketInternalNoteInput,
  TicketMetadataMutationInput,
  TicketDetail,
  TicketExternalId,
} from "./tickets";
import type {
  TicketListFilter,
  TicketListQuery,
  TicketListResult,
} from "./ticket-list-query";
export type {
  TicketListBucket,
  TicketListCountRequest,
  TicketListFilter,
  TicketListQueryCapabilities,
  TicketListQueryRejection,
  TicketListQueryRejectionKind,
  TicketListGroupKey,
  TicketListGroupRequest,
  TicketListQuery,
  TicketListQueryInput,
  TicketListResult,
  TicketSort,
  TicketSortDirection,
  TicketSortKey,
} from "./ticket-list-query";

export type ProviderCapability =
  | "ticket:list"
  | "ticket:count"
  | "ticket:sort"
  | "ticket:group"
  | "ticket:group-count"
  | "ticket:detail"
  | "ticket:links"
  | "ticket:subscription"
  | "ticket:update-state"
  | "ticket:update-priority"
  | "ticket:update-owner"
  | "ticket:update-group"
  | "ticket:update-tags"
  | "ticket:update-links"
  | "ticket:update-subscription"
  | "ticket:add-internal-note"
  | "ticket:add-customer-reply"
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

export type ProviderLookupOption = TicketLookupOption;

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
    filter: TicketListFilter,
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
  addTicketInternalNote?(
    context: ProviderContext,
    ticketExternalId: TicketExternalId,
    input: TicketInternalNoteInput,
  ): Promise<void>;
  addTicketCustomerReply?(
    context: ProviderContext,
    ticketExternalId: TicketExternalId,
    input: TicketCustomerReplyInput,
  ): Promise<void>;
  listAssignableUsers?(context: ProviderContext): Promise<ProviderLookupOption[]>;
  listGroups?(context: ProviderContext): Promise<ProviderLookupOption[]>;
};
