import type {
  ProviderCapability,
  ProviderLookupOption,
} from "@/core/providers";
import { myWorkSavedViewSeedKey } from "@/core/saved-views";
import {
  compileSavedViewConditions,
  myWorkSavedViewConditions,
} from "./conditions";
import { savedViewQueryFromInput, validateSavedViewQuery } from "./query-service";
import type {
  CreateSavedViewInput,
  SavedViewsRepository,
  StoredSavedView,
} from "./repository";
import type {
  EnsureMyWorkSavedViewResult,
  SaveSavedViewInput,
  SaveSavedViewResult,
} from "./service-types";

export {
  deleteManagedSavedView,
  reorderManagedSavedViews,
  saveManagedSavedView,
  setDefaultManagedSavedView,
} from "./manage-service";
export { savedViewQueryFromInput, validateSavedViewQuery } from "./query-service";
export type {
  EnsureMyWorkSavedViewResult,
  SavedViewManageInput,
  SavedViewMutationCode,
  SavedViewMutationResult,
  SaveSavedViewInput,
  SaveSavedViewResult,
} from "./service-types";

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

export async function ensureMyWorkSavedViewResult(
  repository: SavedViewsRepository,
  providerCapabilities: ProviderCapability[],
  userId: string,
  helpdeskConnectionId: string,
  currentUser?: ProviderLookupOption,
): Promise<EnsureMyWorkSavedViewResult> {
  const [existingViews, existingSeed, dismissed] = await Promise.all([
    repository.listForUser(userId, helpdeskConnectionId),
    repository.findSeedForUser(userId, helpdeskConnectionId, myWorkSavedViewSeedKey),
    repository.isSeedDismissed(userId, helpdeskConnectionId, myWorkSavedViewSeedKey),
  ]);

  if (existingSeed) {
    if (!existingViews.some((view) => view.preference?.isDefault)) {
      await repository.setDefaultForUser(userId, existingSeed.id, helpdeskConnectionId);
      return {
        status: "available",
        views: await repository.listForUser(userId, helpdeskConnectionId),
      };
    }
    return { status: "available", views: existingViews };
  }
  if (dismissed) {
    return { status: "available", views: existingViews };
  }

  const conditions = myWorkSavedViewConditions();
  const query = compileSavedViewConditions({ conditions, currentUser });
  if (!query) {
    return {
      status: "unavailable",
      reason: "current-user-unavailable",
      views: existingViews,
    };
  }

  const guardrail = validateSavedViewQuery(providerCapabilities, query);
  if (guardrail.status === "unsupported") {
    return {
      status: "unavailable",
      reason: "unsupported-query",
      rejection: guardrail.rejection,
      views: existingViews,
    };
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

  return {
    status: "available",
    views: await repository.listForUser(userId, helpdeskConnectionId),
  };
}

export async function ensureMyWorkSavedView(
  repository: SavedViewsRepository,
  providerCapabilities: ProviderCapability[],
  userId: string,
  helpdeskConnectionId: string,
  currentUser?: ProviderLookupOption,
): Promise<StoredSavedView[]> {
  const result = await ensureMyWorkSavedViewResult(
    repository,
    providerCapabilities,
    userId,
    helpdeskConnectionId,
    currentUser,
  );
  return result.views;
}
