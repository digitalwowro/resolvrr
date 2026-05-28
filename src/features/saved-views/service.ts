import type {
  ProviderCapability,
  TicketListQueryInput,
  TicketListQueryRejection,
} from "@/core/providers";
import {
  normalizeSavedViewFilter,
  type SavedViewQuery,
  type SavedViewVisibility,
} from "@/core/saved-views";
import { normalizeTicketListQuery } from "@/core/ticket-list-query";
import { guardTicketListQuery } from "@/features/tickets/list-query-guardrails";
import type {
  CreateSavedViewInput,
  SavedViewPreference,
  SavedViewsRepository,
  StoredSavedView,
} from "./repository";

export type SaveSavedViewInput = {
  userId: string;
  helpdeskConnectionId?: string;
  name: string;
  visibility?: SavedViewVisibility;
  iconName?: string;
  colorName?: string;
  query: TicketListQueryInput;
  preference?: SavedViewPreference;
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

  return {
    filter,
    ...(query.sort ? { sort: query.sort } : {}),
    ...(query.group ? { group: query.group } : {}),
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
    ...(input.preference ? { preference: input.preference } : {}),
  };

  return {
    status: "saved",
    savedView: await repository.create(createInput),
  };
}
