import type { ProviderContext } from "@/core/providers";
import { zammadGetJson } from "./client";
import { normalizedManagedAddresses } from "./reply-addresses";
import { zammadEmailAddressListSchema } from "./schemas";

export async function readOptionalZammadReplyPolicy(
  context: ProviderContext,
): Promise<string[] | undefined> {
  try {
    const response = await zammadGetJson(context, "/api/v1/email_addresses");
    const parsed = zammadEmailAddressListSchema.safeParse(response);
    if (!parsed.success) {
      return undefined;
    }
    return normalizedManagedAddresses(
      parsed.data
        .filter((address) => address.active !== false)
        .map((address) => address.email),
    );
  } catch {
    return undefined;
  }
}
