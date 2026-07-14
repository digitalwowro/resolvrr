import { namedAssetValue, namedReferenceValue } from "./participants";
import type { ZammadAssets, ZammadTicket } from "./schemas";

export function zammadTicketStateName(
  ticket: ZammadTicket,
  assets?: ZammadAssets,
): string | undefined {
  return (
    namedReferenceValue(ticket.state) ??
    namedAssetValue(assets?.State, ticket.state_id)
  )?.trim();
}

// Zammad protects its single built-in merged state from normal edits/deletion.
export function isZammadMergedTicket(
  ticket: ZammadTicket,
  assets?: ZammadAssets,
): boolean {
  return zammadTicketStateName(ticket, assets)?.toLowerCase() === "merged";
}
