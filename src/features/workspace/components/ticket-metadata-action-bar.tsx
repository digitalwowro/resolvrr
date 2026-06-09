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
    <section
      aria-label="Staged metadata actions"
      className="shrink-0 border-t border-slate-200 bg-white px-4 py-2"
      role="group"
    >
      <div className="flex items-end justify-between gap-2">
        <Button
          className="!h-8 gap-1.5 !bg-slate-50 px-2 text-sm font-normal hover:!bg-slate-100"
          disabled={!canDiscard || saving}
          icon={<RotateCcw aria-hidden="true" className="size-3.5" />}
          onClick={onDiscard}
          type="button"
          variant="secondary"
        >
          Discard changes
        </Button>
        <div className="flex items-end gap-2">
          <PostUpdateNavigationSelector
            disabled={!canUpdate || saving}
            onValueChange={setNavigation}
            value={navigation}
          />
          <Button
            className="!h-8 gap-1.5 px-3 text-sm font-semibold"
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
    </section>
  );
}
