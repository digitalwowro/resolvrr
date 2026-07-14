import type { TicketPriority, TicketSelectableState } from "./tickets";
import {
  savedViewConditionFields,
  savedViewConditionOperators,
  savedViewMaxConditions,
  savedViewMaxValuesPerCondition,
  type SavedViewCondition,
  type SavedViewConditionField,
  type SavedViewConditionValue,
} from "./saved-view-types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isAllowed<const T extends string>(
  value: unknown,
  allowed: readonly T[],
): value is T {
  return typeof value === "string" && allowed.includes(value as T);
}

function normalizeConditionValue(
  field: SavedViewConditionField,
  value: unknown,
): SavedViewConditionValue | undefined {
  if (!isRecord(value) || typeof value.kind !== "string") {
    return undefined;
  }

  if (field === "owner" && value.kind === "owner-preset") {
    return isAllowed(value.value, ["myself", "unassigned", "all"] as const)
      ? { kind: "owner-preset", value: value.value }
      : undefined;
  }
  if (
    (field === "owner" || field === "group") &&
    value.kind === "external" &&
    typeof value.externalId === "string" &&
    value.externalId.trim()
  ) {
    return {
      kind: "external",
      externalId: value.externalId.trim(),
      ...(typeof value.label === "string" && value.label.trim()
        ? { label: value.label.trim() }
        : {}),
    };
  }
  if (
    field === "state" &&
    value.kind === "state" &&
    isAllowed(value.value, [
      "new",
      "open",
      "pending_reminder",
      "pending_close",
      "closed",
    ] satisfies TicketSelectableState[])
  ) {
    return { kind: "state", value: value.value };
  }
  if (
    field === "priority" &&
    value.kind === "priority" &&
    isAllowed(value.value, [
      "low",
      "medium",
      "high",
    ] satisfies TicketPriority[])
  ) {
    return { kind: "priority", value: value.value };
  }

  return undefined;
}

export function normalizeSavedViewConditions(
  conditions: unknown,
): SavedViewCondition[] | undefined {
  if (!Array.isArray(conditions)) {
    return undefined;
  }

  const normalized = conditions
    .slice(0, savedViewMaxConditions)
    .map((condition, index): SavedViewCondition | undefined => {
      if (
        !isRecord(condition) ||
        !isAllowed(condition.field, savedViewConditionFields) ||
        !isAllowed(condition.operator, savedViewConditionOperators) ||
        !Array.isArray(condition.values)
      ) {
        return undefined;
      }

      const field = condition.field;
      const operator = condition.operator;
      const values = condition.values
        .slice(0, savedViewMaxValuesPerCondition)
        .map((value) => normalizeConditionValue(field, value))
        .filter((value): value is SavedViewConditionValue => Boolean(value));

      if (values.length === 0) {
        return undefined;
      }

      return {
        id:
          typeof condition.id === "string" && condition.id.trim()
            ? condition.id.trim()
            : `condition-${index + 1}`,
        field,
        operator,
        values,
      };
    })
    .filter((condition): condition is SavedViewCondition => Boolean(condition));

  return normalized.length > 0 ? normalized : undefined;
}
