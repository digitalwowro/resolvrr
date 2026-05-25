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
import { updateZammadTicketMetadata } from "./mutations";

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
    "ticket:detail",
    "ticket:update-state",
    "ticket:update-priority",
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
  updateTicketMetadata: updateZammadTicketMetadata,
};
