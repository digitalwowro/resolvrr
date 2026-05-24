import { ProviderError, type HelpdeskProviderPlugin } from "@/core/providers";
import type { HelpdeskConnectionStatus } from "@/core/helpdesk-connections";
import { validateProviderBaseUrl } from "@/security/base-url-validation";
import { safeLogMetadata } from "@/security/safe-log";
import type { HelpdeskConnectionMessageCode } from "./messages";

const validationTimeoutMs = 5000;

export function statusForProviderError(error: unknown): HelpdeskConnectionStatus {
  if (error instanceof ProviderError && error.kind === "credential-auth-failure") {
    return "auth_failed";
  }

  return "disconnected";
}

export function messageCodeForProviderError(
  error: ProviderError,
): HelpdeskConnectionMessageCode {
  if (error.kind === "credential-auth-failure") {
    return "provider-auth-failed";
  }
  if (error.kind === "permission-denied") {
    return "provider-permission-denied";
  }
  if (error.kind === "rate-limited") {
    return "provider-rate-limited";
  }
  if (error.kind === "temporary-provider-failure") {
    return "provider-temporary-failure";
  }
  if (error.kind === "provider-data-mismatch") {
    return "provider-unexpected-response";
  }

  return "provider-validation-failed";
}

function statusClass(statusCode: number | undefined): string | undefined {
  if (statusCode === undefined) {
    return undefined;
  }

  return `${Math.trunc(statusCode / 100)}xx`;
}

export function logProviderValidationFailure(
  plugin: HelpdeskProviderPlugin,
  error: ProviderError,
  input: {
    baseUrl: string;
    phase: "create-connection" | "validate-existing-connection";
  },
): void {
  let canonicalHost: string | undefined;
  try {
    canonicalHost = new URL(input.baseUrl).host;
  } catch {
    canonicalHost = undefined;
  }

  console.warn(
    "Helpdesk provider validation failed",
    safeLogMetadata({
      phase: input.phase,
      providerKey: plugin.key,
      canonicalHost,
      providerErrorKind: error.kind,
      retryable: error.retryable,
      statusCode: error.statusCode,
      statusClass: statusClass(error.statusCode),
      diagnosticCode: error.diagnosticCode,
    }),
  );
}

export async function validateWithProvider(
  plugin: HelpdeskProviderPlugin,
  input: {
    baseUrl: string;
    credentialScheme: string;
    credentialPayload: unknown;
  },
): Promise<string | HelpdeskConnectionMessageCode> {
  let canonicalUrl = input.baseUrl;
  try {
    const validated = await validateProviderBaseUrl(input.baseUrl);
    canonicalUrl = validated.canonicalUrl;
    await plugin.validateConnection({
      baseUrl: validated.canonicalUrl,
      validatedAddresses: validated.addresses,
      credentialScheme: input.credentialScheme,
      credentialPayload: input.credentialPayload,
      timeoutMs: validationTimeoutMs,
    });
    return validated.canonicalUrl;
  } catch (error) {
    if (error instanceof ProviderError) {
      logProviderValidationFailure(plugin, error, {
        baseUrl: canonicalUrl,
        phase: "create-connection",
      });
      return messageCodeForProviderError(error);
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
    validatedAddresses: validated.addresses,
    credentialScheme: input.credentialScheme,
    credentialPayload: input.credentialPayload,
    timeoutMs: validationTimeoutMs,
  });

  return validated.canonicalUrl;
}
