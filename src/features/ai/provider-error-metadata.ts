type ProviderErrorMetadata = {
  code?: string;
  type?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function safeToken(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const token = value.trim();
  return /^[a-z][a-z0-9_.:-]{0,63}$/iu.test(token)
    ? token.toLowerCase()
    : undefined;
}

export function providerErrorMetadata(
  payload: unknown,
): ProviderErrorMetadata {
  if (!isRecord(payload) || !isRecord(payload.error)) {
    return {};
  }
  return {
    code: safeToken(payload.error.code),
    type: safeToken(payload.error.type),
  };
}
