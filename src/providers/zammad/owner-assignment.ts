import { ProviderError, type ProviderContext } from "@/core/providers";
import type { TicketMetadataMutationInput } from "@/core/tickets";
import { relationId } from "./participants";
import type { ZammadTicket } from "./schemas";
import { listZammadAssignableUsers } from "./ticket-lookups";

export async function assertZammadOwnerGroupCompatible(
  context: ProviderContext,
  ticket: ZammadTicket,
  input: TicketMetadataMutationInput,
): Promise<void> {
  if (!input.ownerExternalId && !input.groupExternalId) {
    return;
  }
  const ownerExternalId = input.ownerExternalId ?? relationId(ticket.owner_id);
  const groupExternalId = input.groupExternalId ?? relationId(ticket.group_id);
  if (!ownerExternalId || ownerExternalId === "1" || !groupExternalId) {
    return;
  }

  const eligible = await listZammadAssignableUsers(context, {
    externalIds: [ownerExternalId],
    groupExternalIds: [groupExternalId],
  });
  if (eligible.some((option) => option.externalId === ownerExternalId)) {
    return;
  }
  throw new ProviderError(
    "validation-failure",
    "The selected owner does not have full access to the selected group.",
    false,
    undefined,
    "owner-group-mismatch",
  );
}
