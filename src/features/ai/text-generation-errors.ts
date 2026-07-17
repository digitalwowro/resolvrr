export type AiTextUnavailableReason =
  | "provider-auth-failed"
  | "provider-rate-limited"
  | "provider-request-rejected"
  | "provider-temporary-failure";

export type AiTextUnavailableResult = {
  status: "unavailable";
  reason: AiTextUnavailableReason;
  retryable: boolean;
};

export function aiProviderFailureForStatus(
  status: number,
): AiTextUnavailableResult {
  if (status === 401) {
    return {
      status: "unavailable",
      reason: "provider-auth-failed",
      retryable: false,
    };
  }
  if (status === 403) {
    return {
      status: "unavailable",
      reason: "provider-request-rejected",
      retryable: false,
    };
  }
  if (status === 429) {
    return {
      status: "unavailable",
      reason: "provider-rate-limited",
      retryable: true,
    };
  }
  return {
    status: "unavailable",
    reason: "provider-temporary-failure",
    retryable: status === 408 || status >= 500,
  };
}

export function temporaryAiProviderFailure(): AiTextUnavailableResult {
  return {
    status: "unavailable",
    reason: "provider-temporary-failure",
    retryable: true,
  };
}
