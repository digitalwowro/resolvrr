"use client";

import {
  BriefcaseBusiness,
  Circle,
  Clock,
  Inbox,
  ListFilter,
  SignalHigh,
  Tag,
  Users,
} from "lucide-react";
import type { DropdownOption } from "@/components/ui";
import type {
  SavedViewCondition,
  SavedViewConditionField,
  SavedViewConditionValue,
  SavedViewColorName,
  SavedViewVisibility,
} from "@/core/saved-views";
import type { TicketPriority, TicketState } from "@/core/tickets";
import type { AuthUserRole } from "@/auth/types";
import type {
  SavedViewSettingsData,
  SavedViewSettingsView,
} from "@/features/saved-views/settings-model";
import { myWorkSavedViewConditions } from "@/features/saved-views/conditions";

export type SavedViewDraft = {
  id?: string;
  name: string;
  visibility: SavedViewVisibility;
  iconName: string;
  colorName: SavedViewColorName;
  conditions: SavedViewCondition[];
};

const iconMap = {
  "briefcase-business": BriefcaseBusiness,
  inbox: Inbox,
  "list-filter": ListFilter,
  clock: Clock,
  "circle-dot": Circle,
  "signal-high": SignalHigh,
  users: Users,
  tag: Tag,
};

export const viewColorClass: Record<SavedViewColorName, string> = {
  blue: "bg-blue-500",
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  violet: "bg-violet-500",
  rose: "bg-rose-500",
  teal: "bg-teal-500",
  slate: "bg-slate-500",
  orange: "bg-orange-500",
};

export const stateOptions = [
  { value: "new", label: "New" },
  { value: "open", label: "Open" },
  { value: "pending_reminder", label: "Pending Reminder" },
  { value: "pending_close", label: "Pending Close" },
  { value: "closed", label: "Closed" },
] as const;

export const priorityOptions = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
] as const;

export const savedViewMutationMessages: Record<string, string> = {
  saved: "View saved.",
  deleted: "View deleted.",
  "default-set": "Default view updated.",
  reordered: "View order updated.",
  "invalid-title": "Enter a unique title up to 80 characters.",
  "duplicate-title": "A visible view with this title already exists.",
  "invalid-visibility": "This view visibility is not available.",
  "invalid-appearance": "Choose a valid Lucide icon and color.",
  "invalid-conditions": "Complete every condition row before saving.",
  "unsupported-query": "The active provider does not support this view.",
  "query-too-expensive": "This view is too expensive for the active provider.",
  "permission-denied": "You cannot manage this view.",
  "default-delete-blocked": "Choose another default before deleting this view.",
  "not-found": "The view is no longer available.",
};

export function newSavedViewDraft(): SavedViewDraft {
  return {
    name: "",
    visibility: "personal",
    iconName: "briefcase-business",
    colorName: "blue",
    conditions: [],
  };
}

export function savedViewDraftFromView(view: SavedViewSettingsView): SavedViewDraft {
  return {
    id: view.id,
    name: view.name,
    visibility: view.visibility,
    iconName: view.iconName ?? "briefcase-business",
    colorName: view.colorName ?? "blue",
    conditions: view.conditions.length > 0
      ? view.conditions
      : view.seedKey === "my-work"
        ? myWorkSavedViewConditions()
        : [],
  };
}

export function ViewIcon({ iconName }: { iconName?: string }) {
  const Icon =
    iconMap[(iconName ?? "briefcase-business") as keyof typeof iconMap] ??
    BriefcaseBusiness;
  return <Icon aria-hidden="true" className="size-4" />;
}

export function conditionValueKey(value: SavedViewConditionValue) {
  if (value.kind === "owner-preset") {
    return `owner-preset:${value.value}`;
  }
  if (value.kind === "external") {
    return `external:${value.externalId}`;
  }
  if (value.kind === "state") {
    return `state:${value.value}`;
  }
  return `priority:${value.value}`;
}

export function conditionValueLabel(value: SavedViewConditionValue) {
  if (value.kind === "owner-preset") {
    if (value.value === "myself") {
      return "Myself";
    }
    if (value.value === "unassigned") {
      return "Unassigned";
    }
    return "All owners";
  }
  if (value.kind === "external") {
    return value.label ?? value.externalId;
  }
  if (value.kind === "state") {
    return stateOptions.find((option) => option.value === value.value)?.label ?? value.value;
  }
  return priorityOptions.find((option) => option.value === value.value)?.label ?? value.value;
}

export function conditionOptions(
  field: SavedViewConditionField,
  data: SavedViewSettingsData,
): DropdownOption[] {
  if (field === "state") {
    return stateOptions.map((option) => ({
      value: `state:${option.value}`,
      label: option.label,
    }));
  }
  if (field === "priority") {
    return priorityOptions.map((option) => ({
      value: `priority:${option.value}`,
      label: option.label,
    }));
  }
  if (field === "group") {
    return data.groupOptions.map((option) => ({
      value: `external:${option.externalId}`,
      label: option.label,
    }));
  }
  return [
    { value: "owner-preset:myself", label: "Myself" },
    { value: "owner-preset:unassigned", label: "Unassigned" },
    { value: "owner-preset:all", label: "All owners" },
    ...data.ownerOptions.map((option) => ({
      value: `external:${option.externalId}`,
      label: option.label,
    })),
  ];
}

export function parseConditionValue(
  field: SavedViewConditionField,
  value: string,
  optionLabel: string,
): SavedViewConditionValue | undefined {
  const separatorIndex = value.indexOf(":");
  if (separatorIndex === -1) {
    return undefined;
  }

  const kind = value.slice(0, separatorIndex);
  const rawValue = value.slice(separatorIndex + 1);
  if (!kind || !rawValue) {
    return undefined;
  }
  if (field === "owner" && kind === "owner-preset") {
    if (rawValue === "myself" || rawValue === "unassigned" || rawValue === "all") {
      return { kind: "owner-preset", value: rawValue };
    }
  }
  if ((field === "owner" || field === "group") && kind === "external") {
    return { kind: "external", externalId: rawValue, label: optionLabel };
  }
  if (field === "state" && kind === "state") {
    return stateOptions.some((option) => option.value === rawValue)
      ? { kind: "state", value: rawValue as TicketState }
      : undefined;
  }
  if (field === "priority" && kind === "priority") {
    return priorityOptions.some((option) => option.value === rawValue)
      ? { kind: "priority", value: rawValue as TicketPriority }
      : undefined;
  }
  return undefined;
}

export function replaceSavedViewCondition(
  draft: SavedViewDraft,
  index: number,
  condition: SavedViewCondition,
): SavedViewDraft {
  return {
    ...draft,
    conditions: draft.conditions.map((item, itemIndex) =>
      itemIndex === index ? condition : item,
    ),
  };
}

export function canManageSavedView(
  view: SavedViewSettingsView,
  userRole: AuthUserRole,
) {
  return view.visibility === "personal" || userRole === "ADMIN";
}
