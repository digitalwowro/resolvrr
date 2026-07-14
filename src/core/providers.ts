import type { HelpdeskConnection } from "./helpdesk-connections";
import type {
  HelpdeskNotification,
  HelpdeskNotificationMarkReadInput,
} from "./notifications";
import type { TicketLookupOption } from "./ticket-lookups";
import type {
  TicketInternalNoteInput,
  TicketLinkTarget,
  TicketLinkTargetSearchInput,
  TicketMetadataMutationInput,
  TicketDetailProviderResult,
  TicketExternalId,
} from "./tickets";
import type { TicketCustomerReplyInput } from "./ticket-replies";
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
  | "ticket:update-link-relations"
  | "ticket:update-subscription"
  | "ticket:add-internal-note"
  | "ticket:add-customer-reply"
  | "lookup:link-targets"
  | "lookup:assignable-users"
  | "lookup:groups"
  | "lookup:tags"
  | "lookup:current-user"
  | "notifications:list"
  | "notifications:mark-read"
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
  ): Promise<TicketDetailProviderResult>;
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
  listTags?(context: ProviderContext): Promise<ProviderLookupOption[]>;
  getCurrentUser?(context: ProviderContext): Promise<ProviderLookupOption>;
  searchLinkTargets?(
    context: ProviderContext,
    input: TicketLinkTargetSearchInput,
  ): Promise<TicketLinkTarget[]>;
  listNotifications?(context: ProviderContext): Promise<HelpdeskNotification[]>;
  markNotificationsRead?(
    context: ProviderContext,
    input: HelpdeskNotificationMarkReadInput,
  ): Promise<void>;
};
