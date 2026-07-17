import type { HelpdeskConnection } from "./helpdesk-connections";
import type {
  HelpdeskNotification,
  HelpdeskNotificationMarkReadInput,
} from "./notifications";
import type {
  TicketAssignableUserLookupInput,
  TicketLookupOption,
} from "./ticket-lookups";
import type { TicketMentionLookupInput } from "./ticket-mentions";
import type {
  TicketInternalNoteInput,
  TicketLinkTarget,
  TicketLinkTargetSearchInput,
  TicketMetadataMutationInput,
  TicketDetailProviderResult,
  TicketExternalId,
} from "./tickets";
import type { ProviderTicketCustomerReplyInput } from "./ticket-replies";
import type { ProviderTicketCustomerForwardInput } from "./ticket-forwards";
import type {
  ProviderTicketSignature,
  ProviderTicketSignatureRequest,
} from "./ticket-signatures";
import type {
  TicketInlineImage,
  TicketInlineImageLocator,
} from "./ticket-inline-images";
import type {
  TicketListFilter,
  TicketListQuery,
  TicketListResult,
} from "./ticket-list-query";
import type {
  TicketTaskbarCommand,
  TicketTaskbarSnapshot,
  TicketTaskbarSyncResult,
} from "./ticket-taskbar";
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
  | "ticket:inline-images"
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
  | "ticket:forward-customer-email"
  | "lookup:link-targets"
  | "lookup:assignable-users"
  | "lookup:mentionable-users"
  | "lookup:groups"
  | "lookup:tags"
  | "lookup:current-user"
  | "notifications:list"
  | "notifications:mark-read"
  | "ticket-taskbar:sync"
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

export type ProviderConnectionIdentity = {
  externalId: string;
  displayName: string;
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
  validateConnection(
    input: ProviderConnectionInput,
  ): Promise<ProviderConnectionIdentity>;
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
  getTicketInlineImage?(
    context: ProviderContext,
    input: TicketInlineImageLocator,
  ): Promise<TicketInlineImage>;
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
    input: ProviderTicketCustomerReplyInput,
  ): Promise<void>;
  forwardTicketEmail?(
    context: ProviderContext,
    ticketExternalId: TicketExternalId,
    input: ProviderTicketCustomerForwardInput,
  ): Promise<void>;
  resolveTicketSignature?(
    context: ProviderContext,
    input: ProviderTicketSignatureRequest,
  ): Promise<ProviderTicketSignature>;
  listAssignableUsers?(
    context: ProviderContext,
    input: TicketAssignableUserLookupInput,
  ): Promise<ProviderLookupOption[]>;
  listMentionableUsers?(
    context: ProviderContext,
    input: TicketMentionLookupInput,
  ): Promise<ProviderLookupOption[]>;
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
  readTicketTaskbar?(context: ProviderContext): Promise<TicketTaskbarSnapshot>;
  syncTicketTaskbar?(
    context: ProviderContext,
    commands: TicketTaskbarCommand[],
  ): Promise<TicketTaskbarSyncResult>;
};
