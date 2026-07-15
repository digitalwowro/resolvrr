import { ProviderError, type ProviderContext } from "@/core/providers";
import {
  ProviderBinaryBodyError,
  ProviderJsonBodyError,
  safeProviderBytes,
  safeProviderJson,
} from "@/security/provider-http";
import {
  buildBasicAuthHeader,
  normalizeZammadBaseUrl,
  zammadBasicAuthCredentialsSchema,
  zammadBasicAuthScheme,
} from "./credentials";
import { classifyZammadResponse } from "./errors";

const defaultReadTimeoutMs = 8000;
const defaultWriteTimeoutMs = 8000;
const maxReadResponseBytes = 2 * 1024 * 1024;
const maxWriteResponseBytes = 512 * 1024;
const zammadUserAgent = "Resolvrr/1.0";

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

function authHeader(context: ProviderContext): string {
  if (context.credentialScheme !== zammadBasicAuthScheme) {
    throw new ProviderError(
      "unsupported-capability",
      "This credential scheme is not supported by the helpdesk provider.",
    );
  }

  const parsed = zammadBasicAuthCredentialsSchema.safeParse(
    context.credentialPayload,
  );
  if (!parsed.success) {
    throw new ProviderError(
      "validation-failure",
      "The helpdesk credentials are incomplete.",
    );
  }

  return buildBasicAuthHeader(parsed.data);
}

export function zammadBaseUrl(context: ProviderContext): string {
  return normalizeZammadBaseUrl(context.connection.baseUrl);
}

export async function zammadGetJson(
  context: ProviderContext,
  path: string,
): Promise<unknown> {
  const baseUrl = zammadBaseUrl(context);
  let response;

  try {
    response = await safeProviderJson(`${baseUrl}${path}`, {
      allowedAddresses: context.requestSecurity.validatedAddresses,
      headers: {
        Authorization: authHeader(context),
        Accept: "application/json",
        "User-Agent": zammadUserAgent,
      },
      signal: AbortSignal.timeout(defaultReadTimeoutMs),
      maxResponseBytes: maxReadResponseBytes,
    });
  } catch (error) {
    if (error instanceof ProviderJsonBodyError) {
      throw new ProviderError(
        "provider-data-mismatch",
        "The helpdesk provider returned an unexpected response.",
        false,
        undefined,
        error.reason,
      );
    }

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

  return response.data;
}

export async function zammadGetBytes(
  context: ProviderContext,
  path: string,
  maxResponseBytes: number,
  tooLargeDiagnosticCode = "provider-binary-too-large",
): Promise<Uint8Array> {
  const baseUrl = zammadBaseUrl(context);
  let response;
  try {
    response = await safeProviderBytes(`${baseUrl}${path}`, {
      allowedAddresses: context.requestSecurity.validatedAddresses,
      headers: {
        Authorization: authHeader(context),
        Accept: "application/octet-stream",
        "User-Agent": zammadUserAgent,
      },
      signal: AbortSignal.timeout(defaultReadTimeoutMs),
      maxResponseBytes,
    });
  } catch (error) {
    if (error instanceof ProviderBinaryBodyError) {
      throw new ProviderError(
        "validation-failure",
        "The selected helpdesk attachment is too large.",
        false,
        undefined,
        tooLargeDiagnosticCode,
      );
    }
    throw new ProviderError(
      "temporary-provider-failure",
      "The helpdesk attachment could not be read.",
      true,
      undefined,
      diagnosticCode(error),
    );
  }
  if (response.status < 200 || response.status >= 300) {
    throw classifyZammadResponse(response.status);
  }
  return response.data;
}

export async function zammadSendJson(
  context: ProviderContext,
  path: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  body: unknown,
): Promise<unknown> {
  const baseUrl = zammadBaseUrl(context);
  let response;

  try {
    response = await safeProviderJson(`${baseUrl}${path}`, {
      allowedAddresses: context.requestSecurity.validatedAddresses,
      body: JSON.stringify(body),
      headers: {
        Authorization: authHeader(context),
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": zammadUserAgent,
      },
      method,
      signal: AbortSignal.timeout(defaultWriteTimeoutMs),
      maxResponseBytes: maxWriteResponseBytes,
    });
  } catch (error) {
    if (error instanceof ProviderJsonBodyError) {
      throw new ProviderError(
        "provider-data-mismatch",
        "The helpdesk provider returned an unexpected response.",
        false,
        undefined,
        error.reason,
      );
    }

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

  return response.data;
}
