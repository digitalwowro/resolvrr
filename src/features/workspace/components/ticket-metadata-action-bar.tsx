"use client";

import { RotateCcw, Send } from "lucide-react";
import { Button } from "@/components/ui";
import type { PostUpdateNavigation } from "./post-update-navigation";
import {
  PostUpdateNavigationSelector,
  usePostUpdateNavigationPreference,
} from "./post-update-navigation-selector";

export function TicketMetadataActionBar({
  canDiscard,
  canUpdate,
  onDiscard,
  onUpdate,
  saving,
}: {
  canDiscard: boolean;
  canUpdate: boolean;
  onDiscard(): void;
  onUpdate(navigation: PostUpdateNavigation): void;
  saving: boolean;
}) {
  const [navigation, setNavigation] = usePostUpdateNavigationPreference();

  return (
    <div
      aria-label="Staged metadata actions"
      className="sticky bottom-0 z-10 border-t border-slate-200 bg-white/95 p-2 shadow-[0_-3px_8px_rgba(15,23,42,0.08)] backdrop-blur"
      role="group"
    >
      <div className="flex items-center justify-between gap-2">
        <Button
          className="h-8 gap-1.5 px-2 text-sm font-normal"
          disabled={!canDiscard || saving}
          icon={<RotateCcw aria-hidden="true" className="size-3.5" />}
          onClick={onDiscard}
          type="button"
          variant="secondary"
        >
          Discard changes
        </Button>
        <div className="flex items-center gap-2">
          <PostUpdateNavigationSelector
            onValueChange={setNavigation}
            value={navigation}
          />
          <Button
            className="h-8 gap-1.5 px-3 text-sm font-semibold"
            disabled={!canUpdate}
            icon={<Send aria-hidden="true" className="size-3.5" />}
            loading={saving}
            onClick={() => onUpdate(navigation)}
            type="button"
            variant="primary"
          >
            Update
          </Button>
        </div>
      </div>
    </div>
  );
}
