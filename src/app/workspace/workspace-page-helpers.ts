import type { TicketListQueryInput } from "@/core/providers";
import type { StoredSavedView } from "@/features/saved-views";

export function savedViewTicketListQuery(
  savedView: StoredSavedView | undefined,
): TicketListQueryInput | undefined {
  if (!savedView) {
    return undefined;
  }

  const providerBackedGroup =
    savedView.query.group?.key === "state" ||
    savedView.query.group?.key === "priority"
      ? savedView.query.group
      : undefined;

  return {
    filter: savedView.query.filter,
    ...(savedView.query.sort ? { sort: savedView.query.sort } : {}),
    ...(providerBackedGroup
      ? { count: { includeTotal: true }, group: providerBackedGroup }
      : {}),
  };
}
