import { ProviderError } from "@/core/providers";

export function classifyZammadResponse(status: number): ProviderError {
  if (status === 401) {
    return new ProviderError(
      "credential-auth-failure",
      "The helpdesk credentials were rejected.",
      false,
      status,
    );
  }

  if (status === 403) {
    return new ProviderError(
      "permission-denied",
      "The helpdesk account does not have permission for this action.",
      false,
      status,
    );
  }

  if (status === 429) {
    return new ProviderError(
      "rate-limited",
      "The helpdesk provider is rate limiting requests.",
      true,
      status,
    );
  }

  if (status >= 500) {
    return new ProviderError(
      "temporary-provider-failure",
      "The helpdesk provider is temporarily unavailable.",
      true,
      status,
    );
  }

  return new ProviderError(
    "provider-data-mismatch",
    "The helpdesk provider returned an unexpected response.",
    false,
    status,
  );
}
