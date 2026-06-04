import type {
  ProviderCapability,
  ProviderLookupOption,
  TicketListQueryInput,
  TicketListQueryRejection,
} from "@/core/providers";
import {
  isSavedViewColorName,
  myWorkSavedViewSeedKey,
  normalizeSavedViewFilter,
  normalizeSavedViewGroup,
  normalizeSavedViewSort,
  savedViewTitleMaxLength,
  type SavedViewCondition,
  type SavedViewQuery,
  type SavedViewVisibility,
} from "@/core/saved-views";
import type { AuthUserRole } from "@/auth/types";
import { normalizeTicketListQuery } from "@/core/ticket-list-query";
import { guardTicketListQuery } from "@/features/tickets/list-query-guardrails";
import { normalizeLucideIconName } from "./lucide-icon-names";
import {
  compileSavedViewConditions,
  myWorkSavedViewConditions,
  validateManagedSavedViewConditions,
} from "./conditions";
import type {
  CreateSavedViewInput,
  SavedViewPreference,
  SavedViewsRepository,
  StoredSavedView,
} from "./repository";

export type SavedViewManageInput = {
  id?: string;
  name: string;
  visibility: SavedViewVisibility;
  iconName?: string;
  colorName?: string;
  conditions: SavedViewCondition[];
  makeDefault?: boolean;
};

export type SavedViewMutationCode =
  | "saved"
  | "deleted"
  | "default-set"
  | "reordered"
  | "invalid-title"
  | "duplicate-title"
  | "invalid-visibility"
  | "invalid-appearance"
  | "invalid-conditions"
  | "unsupported-query"
  | "query-too-expensive"
  | "permission-denied"
  | "default-delete-blocked"
  | "not-found";

export type SavedViewMutationResult =
  | {
      ok: true;
      code: SavedViewMutationCode;
      views: StoredSavedView[];
      defaultSavedViewId?: string;
    }
  | {
      ok: false;
      code: SavedViewMutationCode;
      views: StoredSavedView[];
      defaultSavedViewId?: string;
      rejection?: TicketListQueryRejection;
    };

export type SaveSavedViewInput = {
  userId: string;
  helpdeskConnectionId?: string;
  name: string;
  visibility?: SavedViewVisibility;
  iconName?: string;
  colorName?: string;
  query: TicketListQueryInput;
  preference?: SavedViewPreference;
  seedKey?: string;
  isSystem?: boolean;
};

export type SaveSavedViewResult =
  | { status: "saved"; savedView: StoredSavedView }
  | {
      status: "rejected";
      reason: "unsupported-query" | "query-too-expensive";
      rejection: TicketListQueryRejection;
    };

function savedViewQueryInput(query: TicketListQueryInput): TicketListQueryInput {
  const filter = normalizeSavedViewFilter(query.filter);
  const sort = normalizeSavedViewSort(query.sort);
  const group = normalizeSavedViewGroup(query.group);

  return {
    filter,
    ...(sort ? { sort } : {}),
    ...(group ? { group } : {}),
  };
}

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
  helpdeskConnectionId: string,
  code: SavedViewMutationCode,
  ok: boolean,
  rejection?: TicketListQueryRejection,
): Promise<SavedViewMutationResult> {
  const views = await repository.listForUser(userId, helpdeskConnectionId);
  return {
    ok,
    code,
    views,
    defaultSavedViewId: defaultSavedViewId(views),
    ...(rejection ? { rejection } : {}),
  };
}

export function savedViewQueryFromInput(
  query: TicketListQueryInput,
): SavedViewQuery {
  const input = savedViewQueryInput(query);

  return {
    filter: input.filter ?? {},
    ...(input.sort ? { sort: input.sort } : {}),
    ...(input.group ? { group: input.group } : {}),
  };
}

export function validateSavedViewQuery(
  providerCapabilities: ProviderCapability[],
  query: TicketListQueryInput,
) {
  const input = savedViewQueryInput(query);

  return guardTicketListQuery(
    providerCapabilities,
    normalizeTicketListQuery(input),
    input,
  );
}

export async function createSavedView(
  repository: SavedViewsRepository,
  providerCapabilities: ProviderCapability[],
  input: SaveSavedViewInput,
): Promise<SaveSavedViewResult> {
  const guardrail = validateSavedViewQuery(providerCapabilities, input.query);
  if (guardrail.status === "unsupported") {
    return {
      status: "rejected",
      reason: guardrail.reason,
      rejection: guardrail.rejection,
    };
  }

  const createInput: CreateSavedViewInput = {
    ownerUserId: input.userId,
    name: input.name,
    visibility: input.visibility ?? "personal",
    query: savedViewQueryFromInput(input.query),
    ...(input.helpdeskConnectionId
      ? { helpdeskConnectionId: input.helpdeskConnectionId }
      : {}),
    ...(input.iconName ? { iconName: input.iconName } : {}),
    ...(input.colorName ? { colorName: input.colorName } : {}),
    ...(input.seedKey ? { seedKey: input.seedKey } : {}),
    ...(input.isSystem ? { isSystem: input.isSystem } : {}),
    ...(input.preference ? { preference: input.preference } : {}),
  };

  return {
    status: "saved",
    savedView: await repository.create(createInput),
  };
}

export async function ensureMyWorkSavedView(
  repository: SavedViewsRepository,
  providerCapabilities: ProviderCapability[],
  userId: string,
  helpdeskConnectionId: string,
  currentUser?: ProviderLookupOption,
): Promise<StoredSavedView[]> {
  const [existingViews, existingSeed, dismissed] = await Promise.all([
    repository.listForUser(userId, helpdeskConnectionId),
    repository.findSeedForUser(userId, helpdeskConnectionId, myWorkSavedViewSeedKey),
    repository.isSeedDismissed(userId, helpdeskConnectionId, myWorkSavedViewSeedKey),
  ]);

  if (existingSeed) {
    if (!existingViews.some((view) => view.preference?.isDefault)) {
      await repository.setDefaultForUser(userId, existingSeed.id, helpdeskConnectionId);
      return repository.listForUser(userId, helpdeskConnectionId);
    }
    return existingViews;
  }
  if (dismissed) {
    return existingViews;
  }

  const conditions = myWorkSavedViewConditions();
  const query = compileSavedViewConditions({ conditions, currentUser });
  if (!query) {
    return existingViews;
  }

  const guardrail = validateSavedViewQuery(providerCapabilities, query);
  if (guardrail.status === "unsupported") {
    return existingViews;
  }

  await repository.create({
    ownerUserId: userId,
    helpdeskConnectionId,
    name: "My work",
    visibility: "personal",
    iconName: "briefcase-business",
    colorName: "blue",
    seedKey: myWorkSavedViewSeedKey,
    query,
    preference: { position: 0, isDefault: true },
  });

  return repository.listForUser(userId, helpdeskConnectionId);
}

export async function saveManagedSavedView(
  repository: SavedViewsRepository,
  providerCapabilities: ProviderCapability[],
  userId: string,
  userRole: AuthUserRole,
  helpdeskConnectionId: string,
  currentUser: ProviderLookupOption | undefined,
  input: SavedViewManageInput,
): Promise<SavedViewMutationResult> {
  const visibleViews = await repository.listForUser(userId, helpdeskConnectionId);
  const title = normalizeTitle(input.name);
  if (!title) {
    return viewsResult(repository, userId, helpdeskConnectionId, "invalid-title", false);
  }
  if (visibleTitleConflict(visibleViews, title, input.id)) {
    return viewsResult(repository, userId, helpdeskConnectionId, "duplicate-title", false);
  }
  if (input.visibility === "shared" && !hasRoleSharedPermission(userRole)) {
    return viewsResult(
      repository,
      userId,
      helpdeskConnectionId,
      "permission-denied",
      false,
    );
  }

  const conditions = validateManagedSavedViewConditions(input.conditions);
  if (!conditions) {
    return viewsResult(
      repository,
      userId,
      helpdeskConnectionId,
      "invalid-conditions",
      false,
    );
  }
  const query = compileSavedViewConditions({ conditions, currentUser });
  if (!query) {
    return viewsResult(
      repository,
      userId,
      helpdeskConnectionId,
      "invalid-conditions",
      false,
    );
  }
  const guardrail = validateSavedViewQuery(providerCapabilities, query);
  if (guardrail.status === "unsupported") {
    return viewsResult(
      repository,
      userId,
      helpdeskConnectionId,
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
      helpdeskConnectionId,
      "invalid-appearance",
      false,
    );
  }

  let savedView: StoredSavedView | null;
  if (input.id) {
    const existing = visibleViews.find((view) => view.id === input.id);
    if (!existing || (existing.visibility === "shared" && userRole !== "ADMIN")) {
      return viewsResult(repository, userId, helpdeskConnectionId, "not-found", false);
    }
    savedView = await repository.update(userId, input.id, helpdeskConnectionId, {
      name: title,
      visibility: input.visibility,
      query,
      ...(iconName ? { iconName } : {}),
      colorName,
    });
  } else {
    savedView = await repository.create({
      ownerUserId: userId,
      helpdeskConnectionId,
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
    return viewsResult(repository, userId, helpdeskConnectionId, "not-found", false);
  }
  if (input.makeDefault) {
    await repository.setDefaultForUser(userId, savedView.id, helpdeskConnectionId);
  }

  return viewsResult(repository, userId, helpdeskConnectionId, "saved", true);
}

export async function deleteManagedSavedView(
  repository: SavedViewsRepository,
  userId: string,
  userRole: AuthUserRole,
  helpdeskConnectionId: string,
  savedViewId: string,
): Promise<SavedViewMutationResult> {
  const views = await repository.listForUser(userId, helpdeskConnectionId);
  const view = views.find((item) => item.id === savedViewId);
  if (!view || (view.visibility === "shared" && userRole !== "ADMIN")) {
    return viewsResult(repository, userId, helpdeskConnectionId, "not-found", false);
  }
  if (view.preference?.isDefault) {
    return viewsResult(
      repository,
      userId,
      helpdeskConnectionId,
      "default-delete-blocked",
      false,
    );
  }

  const deleted = await repository.deleteForUser(
    userId,
    savedViewId,
    helpdeskConnectionId,
  );
  if (!deleted) {
    return viewsResult(repository, userId, helpdeskConnectionId, "not-found", false);
  }
  if (deleted.seedKey) {
    await repository.dismissSeed(userId, helpdeskConnectionId, deleted.seedKey);
  }

  return viewsResult(repository, userId, helpdeskConnectionId, "deleted", true);
}

export async function setDefaultManagedSavedView(
  repository: SavedViewsRepository,
  userId: string,
  helpdeskConnectionId: string,
  savedViewId: string,
): Promise<SavedViewMutationResult> {
  const ok = await repository.setDefaultForUser(
    userId,
    savedViewId,
    helpdeskConnectionId,
  );
  return viewsResult(
    repository,
    userId,
    helpdeskConnectionId,
    ok ? "default-set" : "not-found",
    ok,
  );
}

export async function reorderManagedSavedViews(
  repository: SavedViewsRepository,
  userId: string,
  helpdeskConnectionId: string,
  savedViewIds: string[],
): Promise<SavedViewMutationResult> {
  const views = await repository.reorderForUser(
    userId,
    helpdeskConnectionId,
    savedViewIds,
  );
  return {
    ok: true,
    code: "reordered",
    views,
    defaultSavedViewId: defaultSavedViewId(views),
  };
}
