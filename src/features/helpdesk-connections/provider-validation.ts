import { ProviderError, type HelpdeskProviderPlugin } from "@/core/providers";
import type { HelpdeskConnectionStatus } from "@/core/helpdesk-connections";
import { validateProviderBaseUrl } from "@/security/base-url-validation";
import type { HelpdeskConnectionMessageCode } from "./messages";

const validationTimeoutMs = 5000;

export function statusForProviderError(error: unknown): HelpdeskConnectionStatus {
  if (error instanceof ProviderError && error.kind === "credential-auth-failure") {
    return "auth_failed";
  }

  return "disconnected";
}

export async function validateWithProvider(
  plugin: HelpdeskProviderPlugin,
  input: {
    baseUrl: string;
    credentialScheme: string;
    credentialPayload: unknown;
  },
): Promise<string | HelpdeskConnectionMessageCode> {
  try {
    const validated = await validateProviderBaseUrl(input.baseUrl);
    await plugin.validateConnection({
      baseUrl: validated.canonicalUrl,
      credentialScheme: input.credentialScheme,
      credentialPayload: input.credentialPayload,
      timeoutMs: validationTimeoutMs,
    });
    return validated.canonicalUrl;
  } catch (error) {
    if (error instanceof ProviderError) {
      return "provider-validation-failed";
    }
    return "invalid-base-url";
  }
}

export async function validateExistingProviderConnection(
  plugin: HelpdeskProviderPlugin,
  input: {
    baseUrl: string;
    credentialScheme: string;
    credentialPayload: unknown;
  },
): Promise<string> {
  const validated = await validateProviderBaseUrl(input.baseUrl);
  await plugin.validateConnection({
    baseUrl: validated.canonicalUrl,
    credentialScheme: input.credentialScheme,
    credentialPayload: input.credentialPayload,
    timeoutMs: validationTimeoutMs,
  });

  return validated.canonicalUrl;
}
