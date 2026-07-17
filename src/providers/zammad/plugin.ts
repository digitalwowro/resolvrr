import {
  ProviderError,
  type HelpdeskProviderPlugin,
  type ProviderConnectionIdentity,
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
import { safeProviderJson } from "@/security/provider-http";
import { getZammadTicketDetail, listZammadTickets } from "./tickets";
import {
  getZammadCurrentUser,
  listZammadAssignableUsers,
  listZammadGroups,
  listZammadTags,
} from "./ticket-lookups";
import { resolveZammadTicketSignature } from "./ticket-signature";
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
import { getZammadTicketAttachment } from "./ticket-attachments";
import { zammadConnectionIdentity } from "./connection-identity";
import { parseZammadTaskbar } from "./taskbar-schema";
import {
  readZammadTicketTaskbar,
  syncZammadTicketTaskbar,
} from "./taskbar-sync";
import {
  listZammadMentionableUsers,
} from "./ticket-mentions";

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

async function validateBasicAuth(
  input: ProviderConnectionInput,
): Promise<ProviderConnectionIdentity> {
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
  let response: Awaited<ReturnType<typeof safeProviderJson>>;

  try {
    response = await safeProviderJson(`${baseUrl}/api/v1/users/me`, {
      allowedAddresses: input.validatedAddresses,
      maxResponseBytes: 256 * 1024,
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

  if (response.status < 200 || response.status >= 300) {
    throw classifyZammadResponse(response.status);
  }

  const identity = zammadConnectionIdentity(response.data);
  try {
    const taskbarResponse = await safeProviderJson(`${baseUrl}/api/v1/taskbar`, {
      allowedAddresses: input.validatedAddresses,
      maxResponseBytes: 512 * 1024,
      headers: {
        Authorization: buildBasicAuthHeader(credentialsResult.data),
        Accept: "application/json",
        "User-Agent": zammadValidationUserAgent,
      },
      signal: AbortSignal.timeout(input.timeoutMs ?? defaultValidationTimeoutMs),
    });
    if (taskbarResponse.status >= 200 && taskbarResponse.status < 300) {
      parseZammadTaskbar(taskbarResponse.data);
    }
  } catch {
    // Taskbar synchronization is optional and is disabled safely at runtime.
  }
  return identity;
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
    "ticket:attachments",
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
    "lookup:mentionable-users",
    "lookup:current-user",
    "lookup:groups",
    "lookup:tags",
    "notifications:list",
    "notifications:mark-read",
    "ticket-taskbar:sync",
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
  getTicketAttachment: getZammadTicketAttachment,
  getTicketInlineImage: getZammadTicketInlineImage,
  updateTicketMetadata: updateZammadTicketMetadata,
  addTicketInternalNote: addZammadTicketInternalNote,
  addTicketCustomerReply: addZammadTicketCustomerReply,
  forwardTicketEmail: forwardZammadTicketEmail,
  listAssignableUsers: listZammadAssignableUsers,
  listMentionableUsers: listZammadMentionableUsers,
  getCurrentUser: getZammadCurrentUser,
  resolveTicketSignature: resolveZammadTicketSignature,
  listGroups: listZammadGroups,
  listTags: listZammadTags,
  searchLinkTargets: searchZammadLinkTargets,
  listNotifications: listZammadNotifications,
  markNotificationsRead: markZammadNotificationsRead,
  readTicketTaskbar: readZammadTicketTaskbar,
  syncTicketTaskbar: syncZammadTicketTaskbar,
};
