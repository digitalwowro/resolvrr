import type {
  TicketListQueryInput,
  TicketListQueryRejection,
} from "@/core/providers";
import type {
  SavedViewCondition,
  SavedViewVisibility,
} from "@/core/saved-views";
import type { SavedViewPreference, StoredSavedView } from "./repository";

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
  | "owner-group-mismatch"
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
  workspaceId?: string;
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

export type EnsureMyWorkSavedViewResult =
  | { status: "available"; views: StoredSavedView[] }
  | {
      status: "unavailable";
      reason: "current-user-unavailable" | "unsupported-query";
      views: StoredSavedView[];
      rejection?: TicketListQueryRejection;
    };
