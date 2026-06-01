import type { Prisma } from "@/generated/prisma/client";
import type {
  WorkspaceTicketDetail,
  WorkspaceTicketTab,
} from "@/features/tickets/workspace-adapter";

export const workspaceOpenTabsPreferenceKey = "workspace.openTabs";
export const workspaceOpenTabsStateVersion = 1;
export const workspaceOpenTabsLimit = 20;

export type WorkspaceTabOrientation = "horizontal" | "vertical";

export type WorkspaceOpenTabsState = {
  activePane: "list" | string;
  openTabs: WorkspaceTicketTab[];
  recentTabs: WorkspaceTicketTab[];
  tabOrientation: WorkspaceTabOrientation;
  updatedAt: string;
  version: typeof workspaceOpenTabsStateVersion;
};

export type SaveWorkspaceOpenTabsStateAction = (
  state: WorkspaceOpenTabsState,
) => Promise<void>;

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function optionalStringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function tabFromStorage(value: unknown): WorkspaceTicketTab | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const id = stringValue(record.id);
  const number = stringValue(record.number);
  const title = stringValue(record.title);
  const customer = stringValue(record.customer);
  const owner = stringValue(record.owner);
  const group = stringValue(record.group);
  const state = stringValue(record.state);
  const priority = stringValue(record.priority);
  if (!id || !number || !title || !customer || !owner || !group || !state || !priority) {
    return undefined;
  }

  return {
    id,
    number,
    title,
    customer,
    ...(optionalStringValue(record.customerExternalId)
      ? { customerExternalId: optionalStringValue(record.customerExternalId) }
      : {}),
    owner,
    group,
    state,
    ...(optionalStringValue(record.stateKey)
      ? { stateKey: optionalStringValue(record.stateKey) as WorkspaceTicketTab["stateKey"] }
      : {}),
    priority,
    ...(optionalStringValue(record.priorityKey)
      ? {
          priorityKey: optionalStringValue(
            record.priorityKey,
          ) as WorkspaceTicketTab["priorityKey"],
        }
      : {}),
  };
}

function tabsFromStorage(value: unknown): WorkspaceTicketTab[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const tabs: WorkspaceTicketTab[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    const tab = tabFromStorage(item);
    if (!tab || seen.has(tab.id)) {
      continue;
    }
    seen.add(tab.id);
    tabs.push(tab);
    if (tabs.length >= workspaceOpenTabsLimit) {
      break;
    }
  }
  return tabs;
}

function tabOrientationFromStorage(value: unknown): WorkspaceTabOrientation {
  return value === "vertical" ? "vertical" : "horizontal";
}

export function workspaceOpenTabsStateFromStorage(
  value: Prisma.JsonValue | unknown,
): WorkspaceOpenTabsState | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  if (record.version !== workspaceOpenTabsStateVersion) {
    return undefined;
  }

  const openTabs = tabsFromStorage(record.openTabs);
  const activePane = stringValue(record.activePane) ?? "list";
  const updatedAt = stringValue(record.updatedAt) ?? new Date(0).toISOString();

  return {
    activePane,
    openTabs,
    recentTabs: tabsFromStorage(record.recentTabs),
    tabOrientation: tabOrientationFromStorage(record.tabOrientation),
    updatedAt,
    version: workspaceOpenTabsStateVersion,
  };
}

export function workspaceOpenTabsStateToStorage(
  state: WorkspaceOpenTabsState,
): Prisma.InputJsonValue {
  return {
    activePane: state.activePane,
    openTabs: state.openTabs.slice(0, workspaceOpenTabsLimit),
    recentTabs: state.recentTabs.slice(0, workspaceOpenTabsLimit),
    tabOrientation: state.tabOrientation,
    updatedAt: state.updatedAt,
    version: workspaceOpenTabsStateVersion,
  };
}

export function workspaceTabFromDetail(
  detail: WorkspaceTicketDetail,
): WorkspaceTicketTab {
  return {
    id: detail.id,
    number: detail.number,
    title: detail.title,
    customer: detail.customer,
    ...(detail.customerExternalId
      ? { customerExternalId: detail.customerExternalId }
      : {}),
    owner: detail.owner,
    group: detail.group,
    state: detail.state,
    ...(detail.stateKey ? { stateKey: detail.stateKey } : {}),
    priority: detail.priority,
    ...(detail.priorityKey ? { priorityKey: detail.priorityKey } : {}),
  };
}

export function cappedWorkspaceTabs(
  tabs: WorkspaceTicketTab[],
): WorkspaceTicketTab[] {
  const seen = new Set<string>();
  const capped: WorkspaceTicketTab[] = [];
  for (const tab of tabs) {
    if (seen.has(tab.id)) {
      continue;
    }
    seen.add(tab.id);
    capped.push(tab);
    if (capped.length >= workspaceOpenTabsLimit) {
      break;
    }
  }
  return capped;
}
