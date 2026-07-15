import type { AuthUserRole } from "@/auth/types";
import type {
  ProviderCapability,
  ProviderLookupOption,
  TicketListQueryRejection,
} from "@/core/providers";
import {
  isSavedViewColorName,
  savedViewTitleMaxLength,
} from "@/core/saved-views";
import { normalizeLucideIconName } from "./lucide-icon-names";
import {
  compileSavedViewConditions,
  validateManagedSavedViewConditions,
} from "./conditions";
import { validateSavedViewQuery } from "./query-service";
import type { SavedViewsRepository, StoredSavedView } from "./repository";
import type {
  SavedViewManageInput,
  SavedViewMutationCode,
  SavedViewMutationResult,
} from "./service-types";

function hasRoleSharedPermission(role: AuthUserRole): boolean {
  return role === "ADMIN";
}

function normalizeTitle(name: string): string | undefined {
  const title = name.trim().replace(/\s+/gu, " ");
  return title && title.length <= savedViewTitleMaxLength ? title : undefined;
}

function visibleTitleConflict(
  views: StoredSavedView[],
  name: string,
  editingViewId?: string,
) {
  const normalized = name.toLocaleLowerCase();
  return views.some(
    (view) =>
      view.id !== editingViewId &&
      view.name.trim().toLocaleLowerCase() === normalized,
  );
}

function defaultSavedViewId(views: StoredSavedView[]): string | undefined {
  return views.find((view) => view.preference?.isDefault)?.id ?? views[0]?.id;
}

async function viewsResult(
  repository: SavedViewsRepository,
  userId: string,
  workspaceId: string,
  code: SavedViewMutationCode,
  ok: boolean,
  rejection?: TicketListQueryRejection,
): Promise<SavedViewMutationResult> {
  const views = await repository.listForUser(userId, workspaceId);
  return {
    ok,
    code,
    views,
    defaultSavedViewId: defaultSavedViewId(views),
    ...(rejection ? { rejection } : {}),
  };
}

export async function saveManagedSavedView(
  repository: SavedViewsRepository,
  providerCapabilities: ProviderCapability[],
  userId: string,
  userRole: AuthUserRole,
  workspaceId: string,
  currentUser: ProviderLookupOption | undefined,
  input: SavedViewManageInput,
): Promise<SavedViewMutationResult> {
  const visibleViews = await repository.listForUser(userId, workspaceId);
  const title = normalizeTitle(input.name);
  if (!title) {
    return viewsResult(repository, userId, workspaceId, "invalid-title", false);
  }
  if (visibleTitleConflict(visibleViews, title, input.id)) {
    return viewsResult(repository, userId, workspaceId, "duplicate-title", false);
  }
  if (input.visibility === "shared" && !hasRoleSharedPermission(userRole)) {
    return viewsResult(
      repository,
      userId,
      workspaceId,
      "permission-denied",
      false,
    );
  }

  const conditions = validateManagedSavedViewConditions(input.conditions);
  if (!conditions) {
    return viewsResult(
      repository,
      userId,
      workspaceId,
      "invalid-conditions",
      false,
    );
  }
  const query = compileSavedViewConditions({ conditions, currentUser });
  if (!query) {
    return viewsResult(
      repository,
      userId,
      workspaceId,
      "invalid-conditions",
      false,
    );
  }
  const guardrail = validateSavedViewQuery(providerCapabilities, query);
  if (guardrail.status === "unsupported") {
    return viewsResult(
      repository,
      userId,
      workspaceId,
      guardrail.reason,
      false,
      guardrail.rejection,
    );
  }

  const iconName = input.iconName
    ? normalizeLucideIconName(input.iconName)
    : undefined;
  const colorName = input.colorName ?? "blue";
  if ((input.iconName && !iconName) || !isSavedViewColorName(colorName)) {
    return viewsResult(
      repository,
      userId,
      workspaceId,
      "invalid-appearance",
      false,
    );
  }

  let savedView: StoredSavedView | null;
  if (input.id) {
    const existing = visibleViews.find((view) => view.id === input.id);
    if (!existing || (existing.visibility === "shared" && userRole !== "ADMIN")) {
      return viewsResult(repository, userId, workspaceId, "not-found", false);
    }
    savedView = await repository.update(userId, input.id, workspaceId, {
      ownerUserId: userId,
      name: title,
      visibility: input.visibility,
      query,
      ...(iconName ? { iconName } : {}),
      colorName,
    });
  } else {
    savedView = await repository.create({
      ownerUserId: userId,
      workspaceId,
      name: title,
      visibility: input.visibility,
      query,
      ...(iconName ? { iconName } : {}),
      colorName,
      preference: {
        position: visibleViews.length,
        isDefault: Boolean(input.makeDefault || visibleViews.length === 0),
      },
    });
  }

  if (!savedView) {
    return viewsResult(repository, userId, workspaceId, "not-found", false);
  }
  if (input.makeDefault) {
    await repository.setDefaultForUser(userId, savedView.id, workspaceId);
  }

  return viewsResult(repository, userId, workspaceId, "saved", true);
}

export async function deleteManagedSavedView(
  repository: SavedViewsRepository,
  userId: string,
  userRole: AuthUserRole,
  workspaceId: string,
  savedViewId: string,
): Promise<SavedViewMutationResult> {
  const views = await repository.listForUser(userId, workspaceId);
  const view = views.find((item) => item.id === savedViewId);
  if (!view || (view.visibility === "shared" && userRole !== "ADMIN")) {
    return viewsResult(repository, userId, workspaceId, "not-found", false);
  }
  if (view.preference?.isDefault) {
    return viewsResult(
      repository,
      userId,
      workspaceId,
      "default-delete-blocked",
      false,
    );
  }

  const deleted = await repository.deleteForUser(
    userId,
    savedViewId,
    workspaceId,
  );
  if (!deleted) {
    return viewsResult(repository, userId, workspaceId, "not-found", false);
  }
  if (deleted.seedKey) {
    await repository.dismissSeed(userId, workspaceId, deleted.seedKey);
  }

  return viewsResult(repository, userId, workspaceId, "deleted", true);
}

export async function setDefaultManagedSavedView(
  repository: SavedViewsRepository,
  userId: string,
  workspaceId: string,
  savedViewId: string,
): Promise<SavedViewMutationResult> {
  const ok = await repository.setDefaultForUser(
    userId,
    savedViewId,
    workspaceId,
  );
  return viewsResult(
    repository,
    userId,
    workspaceId,
    ok ? "default-set" : "not-found",
    ok,
  );
}

export async function reorderManagedSavedViews(
  repository: SavedViewsRepository,
  userId: string,
  workspaceId: string,
  savedViewIds: string[],
): Promise<SavedViewMutationResult> {
  const views = await repository.reorderForUser(
    userId,
    workspaceId,
    savedViewIds,
  );
  return {
    ok: true,
    code: "reordered",
    views,
    defaultSavedViewId: defaultSavedViewId(views),
  };
}
