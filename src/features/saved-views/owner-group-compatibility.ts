import type { ProviderLookupOption } from "@/core/providers";
import type { SavedViewCondition } from "@/core/saved-views";
import type {
  TicketAssignableUserLookupInput,
  TicketLookupList,
} from "@/core/ticket-lookups";

function externalValues(
  conditions: SavedViewCondition[],
  field: "group" | "owner",
): string[] {
  return conditions
    .filter((condition) =>
      condition.field === field && condition.operator === "is",
    )
    .flatMap((condition) => condition.values)
    .filter((value) => value.kind === "external")
    .map((value) => value.externalId);
}

export function savedViewOwnerGroupScope(
  conditions: SavedViewCondition[],
  currentUser?: ProviderLookupOption,
) {
  const includesMyself = conditions.some((condition) =>
    condition.field === "owner" &&
    condition.operator === "is" &&
    condition.values.some((value) =>
      value.kind === "owner-preset" && value.value === "myself",
    ),
  );
  return {
    groupExternalIds: [...new Set(externalValues(conditions, "group"))],
    ownerExternalIds: [
      ...new Set([
        ...externalValues(conditions, "owner"),
        ...(includesMyself && currentUser ? [currentUser.externalId] : []),
      ]),
    ],
    unresolvedMyself: includesMyself && !currentUser,
  };
}

export async function savedViewOwnersMatchGroups({
  conditions,
  currentUser,
  lookup,
}: {
  conditions: SavedViewCondition[];
  currentUser?: ProviderLookupOption;
  lookup?: (input: TicketAssignableUserLookupInput) => Promise<TicketLookupList>;
}) {
  const scope = savedViewOwnerGroupScope(conditions, currentUser);
  if (scope.unresolvedMyself) {
    return false;
  }
  if (scope.groupExternalIds.length === 0 || scope.ownerExternalIds.length === 0) {
    return true;
  }
  if (!lookup) {
    return false;
  }
  const result = await lookup({
    externalIds: scope.ownerExternalIds,
    groupExternalIds: scope.groupExternalIds,
  });
  if (result.status !== "available") {
    return false;
  }
  const eligibleIds = new Set(result.options.map((option) => option.externalId));
  return scope.ownerExternalIds.every((externalId) => eligibleIds.has(externalId));
}
