import { ProviderError } from "@/core/providers";

export function zammadTicketId(value: string): number {
  const normalized = value.trim();
  if (!/^\d+$/u.test(normalized)) {
    throw new ProviderError(
      "validation-failure",
      "Invalid ticket reference for the helpdesk provider.",
    );
  }
  const id = Number(normalized);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new ProviderError(
      "validation-failure",
      "Invalid ticket reference for the helpdesk provider.",
    );
  }
  return id;
}
