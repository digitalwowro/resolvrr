import type { ProviderLookupOption } from "@/core/providers";
import {
  savedViewMaxConditions,
  savedViewMaxValuesPerCondition,
  normalizeSavedViewConditions,
  normalizeSavedViewFilter,
  type SavedViewCondition,
  type SavedViewConditionValue,
  type SavedViewQuery,
} from "@/core/saved-views";

function uniqueList(values: string[]) {
  return [...new Set(values.filter((value) => value.trim()).map((value) => value.trim()))];
}

function externalIds(values: SavedViewConditionValue[]) {
  return uniqueList(
    values
      .filter((value): value is Extract<SavedViewConditionValue, { kind: "external" }> =>
        value.kind === "external",
      )
      .map((value) => value.externalId),
  );
}

function conditionHasOwnerPreset(
  condition: SavedViewCondition,
  preset: "myself" | "unassigned" | "all",
) {
  return condition.values.some(
    (value) => value.kind === "owner-preset" && value.value === preset,
  );
}

export function compileSavedViewConditions({
  conditions,
  currentUser,
}: {
  conditions: SavedViewCondition[];
  currentUser?: ProviderLookupOption;
}): SavedViewQuery | undefined {
  const filter = normalizeSavedViewFilter({});

  for (const condition of conditions) {
    if (condition.values.length === 0) {
      return undefined;
    }

    if (condition.field === "state") {
      const states = condition.values
        .filter((value): value is Extract<SavedViewConditionValue, { kind: "state" }> =>
          value.kind === "state",
        )
        .map((value) => value.value);
      if (states.length === 0) {
        return undefined;
      }
      if (condition.operator === "is") {
        filter.states = uniqueList(states) as typeof states;
      } else {
        filter.excludedStates = uniqueList(states) as typeof states;
      }
      continue;
    }

    if (condition.field === "priority") {
      const priorities = condition.values
        .filter((value): value is Extract<SavedViewConditionValue, { kind: "priority" }> =>
          value.kind === "priority",
        )
        .map((value) => value.value);
      if (priorities.length === 0) {
        return undefined;
      }
      if (condition.operator === "is") {
        filter.priorities = uniqueList(priorities) as typeof priorities;
      } else {
        filter.excludedPriorities = uniqueList(priorities) as typeof priorities;
      }
      continue;
    }

    if (condition.field === "group") {
      const groupExternalIds = externalIds(condition.values);
      if (groupExternalIds.length === 0) {
        return undefined;
      }
      if (condition.operator === "is") {
        filter.groupExternalIds = groupExternalIds;
      } else {
        filter.excludedGroupExternalIds = groupExternalIds;
      }
      continue;
    }

    if (conditionHasOwnerPreset(condition, "all")) {
      continue;
    }

    const ownerExternalIds = externalIds(condition.values);
    if (conditionHasOwnerPreset(condition, "myself")) {
      if (!currentUser?.externalId) {
        return undefined;
      }
      ownerExternalIds.push(currentUser.externalId);
    }
    const hasUnassigned = conditionHasOwnerPreset(condition, "unassigned");
    if (ownerExternalIds.length === 0 && !hasUnassigned) {
      return undefined;
    }
    if (condition.operator === "is") {
      if (ownerExternalIds.length > 0) {
        filter.ownerExternalIds = uniqueList(ownerExternalIds);
      }
      if (hasUnassigned) {
        filter.ownerUnassigned = true;
      }
    } else {
      if (ownerExternalIds.length > 0) {
        filter.excludedOwnerExternalIds = uniqueList(ownerExternalIds);
      }
      if (hasUnassigned) {
        filter.excludeOwnerUnassigned = true;
      }
    }
  }

  return {
    filter,
    ...(conditions.length > 0 ? { conditions } : {}),
  };
}

function conditionSignature(condition: SavedViewCondition) {
  return `${condition.field}:${condition.operator}`;
}

export function validateManagedSavedViewConditions(
  conditions: unknown,
): SavedViewCondition[] | undefined {
  const normalized = normalizeSavedViewConditions(conditions);
  if (!normalized || normalized.length === 0) {
    return undefined;
  }
  if (normalized.length > savedViewMaxConditions) {
    return undefined;
  }

  const signatures = new Set<string>();
  for (const condition of normalized) {
    if (condition.values.length === 0 || condition.values.length > savedViewMaxValuesPerCondition) {
      return undefined;
    }
    const signature = conditionSignature(condition);
    if (signatures.has(signature)) {
      return undefined;
    }
    signatures.add(signature);
  }

  const persistedConditions = normalized.filter(
    (condition) =>
      condition.field !== "owner" ||
      !condition.values.some(
        (value) => value.kind === "owner-preset" && value.value === "all",
      ),
  );

  return persistedConditions.length > 0 ? persistedConditions : undefined;
}

export function myWorkSavedViewConditions(): SavedViewCondition[] {
  return [
    {
      id: "owner-myself",
      field: "owner",
      operator: "is",
      values: [{ kind: "owner-preset", value: "myself" }],
    },
    {
      id: "state-not-closed",
      field: "state",
      operator: "is_not",
      values: [{ kind: "state", value: "closed" }],
    },
  ];
}
