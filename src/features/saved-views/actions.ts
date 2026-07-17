"use server";

import { requireCurrentUser } from "@/auth/current-user";
import { env } from "@/config/env";
import { prismaHelpdeskConnectionsRepository } from "@/data/helpdesk-connections-repository";
import { prismaSavedViewsRepository } from "@/data/saved-views-repository";
import { providerRegistry } from "@/providers";
import { loadActiveTicketProviderContext } from "@/features/tickets/connection-context";
import {
  dispatchAssignableUsersRead,
  dispatchCurrentHelpdeskUserRead,
  dispatchTicketLookupDataRead,
} from "@/features/tickets/ticket-lookup-service";
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
import { savedViewOwnersMatchGroups } from "./owner-group-compatibility";

async function ownersMatchSelectedGroups({
  conditions,
  context,
  currentUser,
}: {
  conditions: SavedViewManageInput["conditions"];
  context: Awaited<ReturnType<typeof activeSavedViewContext>>;
  currentUser?: SavedViewSettingsData["currentUser"];
}) {
  const providerContext = context?.providerContext;
  return savedViewOwnersMatchGroups({
    conditions,
    currentUser,
    lookup: providerContext
      ? (input) => dispatchAssignableUsersRead(providerContext, input)
      : undefined,
  });
}

function emptySettingsData(canManageShared: boolean): SavedViewSettingsData {
  return {
    views: [],
    ownerOptions: [],
    groupOptions: [],
    canManageShared,
  };
}

async function activeSavedViewContext(userId: string) {
  const activeWorkspaceId =
    await prismaHelpdeskConnectionsRepository.getActiveWorkspaceId(userId);
  if (!activeWorkspaceId) {
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
      workspaceId: activeWorkspaceId,
      providerCapabilities: [] as const,
    };
  }

  return {
    workspaceId: activeWorkspaceId,
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
    prismaSavedViewsRepository.listForUser(user.id, context.workspaceId),
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

  if (!await ownersMatchSelectedGroups({
    conditions: input.conditions,
    context,
    currentUser,
  })) {
    return {
      ok: false,
      code: "owner-group-mismatch",
      data: await loadSettingsDataForUser(),
    };
  }

  const result = await saveManagedSavedView(
    prismaSavedViewsRepository,
    [...context.providerCapabilities],
    user.id,
    user.role,
    context.workspaceId,
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
    context.workspaceId,
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
    context.workspaceId,
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
    context.workspaceId,
    savedViewIds,
  );

  return {
    ok: result.ok,
    code: result.code,
    data: await loadSettingsDataForUser(),
  };
}
