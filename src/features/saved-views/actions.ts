"use server";

import { requireCurrentUser } from "@/auth/current-user";
import { env } from "@/config/env";
import { prismaHelpdeskConnectionsRepository } from "@/data/helpdesk-connections-repository";
import { prismaSavedViewsRepository } from "@/data/saved-views-repository";
import { providerRegistry } from "@/providers";
import { loadActiveTicketProviderContext } from "@/features/tickets/connection-context";
import {
  dispatchCurrentHelpdeskUserRead,
  dispatchTicketLookupDataRead,
} from "@/features/tickets/provider-dispatch";
import {
  deleteManagedSavedView,
  reorderManagedSavedViews,
  saveManagedSavedView,
  setDefaultManagedSavedView,
  type SavedViewManageInput,
  type SavedViewMutationCode,
} from "./service";
import {
  savedViewSettingsDataFromStored,
  type SavedViewSettingsActionResult,
  type SavedViewSettingsData,
} from "./settings-model";

function emptySettingsData(canManageShared: boolean): SavedViewSettingsData {
  return {
    views: [],
    ownerOptions: [],
    groupOptions: [],
    canManageShared,
  };
}

async function activeSavedViewContext(userId: string) {
  const activeConnectionId =
    await prismaHelpdeskConnectionsRepository.getActiveConnectionId(userId);
  if (!activeConnectionId) {
    return undefined;
  }

  const providerContext = await loadActiveTicketProviderContext(
    prismaHelpdeskConnectionsRepository,
    providerRegistry,
    env.APP_ENCRYPTION_KEY,
    userId,
    "list",
  );
  if (providerContext.status === "unavailable") {
    return {
      helpdeskConnectionId: activeConnectionId,
      providerCapabilities: [] as const,
    };
  }

  return {
    helpdeskConnectionId: activeConnectionId,
    providerCapabilities: providerContext.value.plugin.capabilities,
    providerContext: providerContext.value,
  };
}

async function loadSettingsDataForUser(): Promise<SavedViewSettingsData> {
  const user = await requireCurrentUser();
  const context = await activeSavedViewContext(user.id);
  const canManageShared = user.role === "ADMIN";
  if (!context) {
    return emptySettingsData(canManageShared);
  }

  const [views, lookupData, currentUserLookup] = await Promise.all([
    prismaSavedViewsRepository.listForUser(user.id, context.helpdeskConnectionId),
    context.providerContext
      ? dispatchTicketLookupDataRead(context.providerContext)
      : undefined,
    context.providerContext
      ? dispatchCurrentHelpdeskUserRead(context.providerContext)
      : undefined,
  ]);

  const currentUser =
    currentUserLookup?.status === "available"
      ? currentUserLookup.options[0]
      : undefined;

  return savedViewSettingsDataFromStored({
    views,
    canManageShared,
    currentUser,
    ownerOptions:
      lookupData?.assignableUsers.status === "available"
        ? lookupData.assignableUsers.options
        : [],
    groupOptions:
      lookupData?.groups.status === "available" ? lookupData.groups.options : [],
  });
}

async function mutationResult(
  code: SavedViewMutationCode,
  ok: boolean,
): Promise<SavedViewSettingsActionResult> {
  return {
    ok,
    code,
    data: await loadSettingsDataForUser(),
  };
}

export async function loadWorkspaceSavedViewsSettingsAction() {
  return loadSettingsDataForUser();
}

export async function saveWorkspaceSavedViewAction(
  input: SavedViewManageInput,
): Promise<SavedViewSettingsActionResult> {
  const user = await requireCurrentUser();
  const context = await activeSavedViewContext(user.id);
  if (!context) {
    return mutationResult("not-found", false);
  }

  const currentUserLookup = context.providerContext
    ? await dispatchCurrentHelpdeskUserRead(context.providerContext)
    : undefined;
  const currentUser =
    currentUserLookup?.status === "available"
      ? currentUserLookup.options[0]
      : undefined;

  const result = await saveManagedSavedView(
    prismaSavedViewsRepository,
    [...context.providerCapabilities],
    user.id,
    user.role,
    context.helpdeskConnectionId,
    currentUser,
    input,
  );

  return {
    ok: result.ok,
    code: result.code,
    data: await loadSettingsDataForUser(),
  };
}

export async function deleteWorkspaceSavedViewAction(
  savedViewId: string,
): Promise<SavedViewSettingsActionResult> {
  const user = await requireCurrentUser();
  const context = await activeSavedViewContext(user.id);
  if (!context) {
    return mutationResult("not-found", false);
  }

  const result = await deleteManagedSavedView(
    prismaSavedViewsRepository,
    user.id,
    user.role,
    context.helpdeskConnectionId,
    savedViewId,
  );

  return {
    ok: result.ok,
    code: result.code,
    data: await loadSettingsDataForUser(),
  };
}

export async function setDefaultWorkspaceSavedViewAction(
  savedViewId: string,
): Promise<SavedViewSettingsActionResult> {
  const user = await requireCurrentUser();
  const context = await activeSavedViewContext(user.id);
  if (!context) {
    return mutationResult("not-found", false);
  }

  const result = await setDefaultManagedSavedView(
    prismaSavedViewsRepository,
    user.id,
    context.helpdeskConnectionId,
    savedViewId,
  );

  return {
    ok: result.ok,
    code: result.code,
    data: await loadSettingsDataForUser(),
  };
}

export async function reorderWorkspaceSavedViewsAction(
  savedViewIds: string[],
): Promise<SavedViewSettingsActionResult> {
  const user = await requireCurrentUser();
  const context = await activeSavedViewContext(user.id);
  if (!context) {
    return mutationResult("not-found", false);
  }

  const result = await reorderManagedSavedViews(
    prismaSavedViewsRepository,
    user.id,
    context.helpdeskConnectionId,
    savedViewIds,
  );

  return {
    ok: result.ok,
    code: result.code,
    data: await loadSettingsDataForUser(),
  };
}
