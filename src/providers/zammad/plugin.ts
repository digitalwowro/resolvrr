import {
  ProviderError,
  type HelpdeskProviderPlugin,
  type ProviderConnectionInput,
} from "@/core/providers";
import {
  buildBasicAuthHeader,
  normalizeZammadBaseUrl,
  zammadBasicAuthCredentialsSchema,
  zammadBasicAuthScheme,
  zammadProviderKey,
} from "./credentials";
import { classifyZammadResponse } from "./errors";
import { safeProviderFetch } from "@/security/provider-http";
import { getZammadTicketDetail, listZammadTickets } from "./tickets";
import {
  getZammadCurrentUser,
  listZammadAssignableUsers,
  listZammadGroups,
  listZammadTags,
} from "./ticket-lookups";
import { searchZammadLinkTargets } from "./ticket-link-targets";
import { updateZammadTicketMetadata } from "./mutations";
import {
  addZammadTicketCustomerReply,
  addZammadTicketInternalNote,
  forwardZammadTicketEmail,
} from "./ticket-article-mutations";
import {
  listZammadNotifications,
  markZammadNotificationsRead,
} from "./notifications";
import { getZammadTicketInlineImage } from "./ticket-inline-images";

const defaultValidationTimeoutMs = 5000;
const zammadValidationUserAgent = "Resolvrr/1.0";

function diagnosticCode(error: unknown): string | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }

  return error instanceof Error ? error.name : undefined;
}

async function validateBasicAuth(input: ProviderConnectionInput): Promise<void> {
  if (input.credentialScheme !== zammadBasicAuthScheme) {
    throw new ProviderError(
      "unsupported-capability",
      "This credential scheme is not supported by the helpdesk provider.",
    );
  }

  const credentialsResult = zammadBasicAuthCredentialsSchema.safeParse(
    input.credentialPayload,
  );
  if (!credentialsResult.success) {
    throw new ProviderError(
      "validation-failure",
      "The helpdesk credentials are incomplete.",
    );
  }

  const baseUrl = normalizeZammadBaseUrl(input.baseUrl);
  let response: Response;

  try {
    response = await safeProviderFetch(`${baseUrl}/api/v1/users/me`, {
      allowedAddresses: input.validatedAddresses,
      headers: {
        Authorization: buildBasicAuthHeader(credentialsResult.data),
        Accept: "application/json",
        "User-Agent": zammadValidationUserAgent,
      },
      signal: AbortSignal.timeout(input.timeoutMs ?? defaultValidationTimeoutMs),
    });
  } catch (error) {
    throw new ProviderError(
      "temporary-provider-failure",
      "The helpdesk provider could not be reached.",
      true,
      undefined,
      diagnosticCode(error),
    );
  }

  if (!response.ok) {
    throw classifyZammadResponse(response.status);
  }
}

export const zammadProviderPlugin: HelpdeskProviderPlugin = {
  key: zammadProviderKey,
  label: "Zammad",
  capabilities: [
    "ticket:list",
    "ticket:count",
    "ticket:sort",
    "ticket:group",
    "ticket:group-count",
    "ticket:detail",
    "ticket:inline-images",
    "ticket:links",
    "ticket:subscription",
    "ticket:update-state",
    "ticket:update-priority",
    "ticket:update-owner",
    "ticket:update-group",
    "ticket:update-tags",
    "ticket:update-links",
    "ticket:update-link-relations",
    "ticket:update-subscription",
    "ticket:add-internal-note",
    "ticket:add-customer-reply",
    "ticket:forward-customer-email",
    "lookup:link-targets",
    "lookup:assignable-users",
    "lookup:current-user",
    "lookup:groups",
    "lookup:tags",
    "notifications:list",
    "notifications:mark-read",
  ],
  credentialSchemes: [
    {
      key: zammadBasicAuthScheme,
      label: "Basic Auth",
      fields: [
        { name: "username", label: "Username", type: "text", required: true },
        {
          name: "password",
          label: "Password",
          type: "password",
          required: true,
        },
      ],
    },
  ],
  validateConnection: validateBasicAuth,
  listTickets: listZammadTickets,
  getTicketDetail: getZammadTicketDetail,
  getTicketInlineImage: getZammadTicketInlineImage,
  updateTicketMetadata: updateZammadTicketMetadata,
  addTicketInternalNote: addZammadTicketInternalNote,
  addTicketCustomerReply: addZammadTicketCustomerReply,
  forwardTicketEmail: forwardZammadTicketEmail,
  listAssignableUsers: listZammadAssignableUsers,
  getCurrentUser: getZammadCurrentUser,
  listGroups: listZammadGroups,
  listTags: listZammadTags,
  searchLinkTargets: searchZammadLinkTargets,
  listNotifications: listZammadNotifications,
  markNotificationsRead: markZammadNotificationsRead,
};
