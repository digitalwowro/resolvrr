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

const defaultValidationTimeoutMs = 5000;

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
    response = await fetch(`${baseUrl}/api/v1/users/me`, {
      headers: {
        Authorization: buildBasicAuthHeader(credentialsResult.data),
        Accept: "application/json",
      },
      redirect: "manual",
      signal: AbortSignal.timeout(input.timeoutMs ?? defaultValidationTimeoutMs),
    });
  } catch {
    throw new ProviderError(
      "temporary-provider-failure",
      "The helpdesk provider could not be reached.",
      true,
    );
  }

  if (!response.ok) {
    throw classifyZammadResponse(response.status);
  }
}

function unsupported(operation: string): never {
  throw new ProviderError(
    "unsupported-capability",
    `${operation} is not implemented in the foundation provider scaffold.`,
  );
}

export const zammadProviderPlugin: HelpdeskProviderPlugin = {
  key: zammadProviderKey,
  label: "Zammad",
  capabilities: [],
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
  listTickets: async () => unsupported("Ticket list"),
  countTickets: async () => unsupported("Ticket count"),
  getTicketDetail: async () => unsupported("Ticket detail"),
  updateTicketFields: async () => unsupported("Ticket update"),
};
