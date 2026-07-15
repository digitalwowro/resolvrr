import { ProviderError, type ProviderConnectionIdentity } from "@/core/providers";
import { relationId, zammadUserDisplayName, zammadUserEmail } from "./participants";
import { zammadUserSchema } from "./schemas";

export function zammadConnectionIdentity(
  value: unknown,
): ProviderConnectionIdentity {
  const parsed = zammadUserSchema.safeParse(value);
  if (!parsed.success) {
    throw new ProviderError(
      "provider-data-mismatch",
      "The helpdesk provider returned an unexpected current-user response.",
    );
  }

  const externalId = relationId(parsed.data.id);
  const displayName =
    zammadUserDisplayName(parsed.data) ?? zammadUserEmail(parsed.data);
  if (!externalId || !displayName) {
    throw new ProviderError(
      "provider-data-mismatch",
      "The helpdesk provider did not return a usable current-user identity.",
    );
  }

  return { externalId, displayName };
}
