"use client";

import { Check } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { cn } from "@/components/ui/classnames";
import {
  curatedSavedViewIconNames,
} from "@/core/saved-views";
import type { AuthUserRole } from "@/auth/types";
import type {
  DeleteWorkspaceSavedViewAction,
  ReorderWorkspaceSavedViewsAction,
  SaveWorkspaceSavedViewAction,
  SavedViewSettingsData,
  SavedViewSettingsView,
  SetDefaultWorkspaceSavedViewAction,
} from "@/features/saved-views/settings-model";
import { ViewConditionsEditor } from "./workspace-settings-view-conditions";
import { ViewsList } from "./workspace-settings-views-list";
import {
  canManageSavedView,
  newSavedViewDraft,
  savedViewDraftFromView,
  savedViewMutationMessages,
  ViewIcon,
} from "./workspace-settings-views-utils";
import { ViewDetailsForm } from "./workspace-settings-view-details-form";

export function ViewsSection({
  activeWorkspaceLabel,
  data,
  deleteSavedViewAction,
  onDataChange,
  reorderSavedViewsAction,
  saveSavedViewAction,
  setDefaultSavedViewAction,
  userRole,
}: {
  activeWorkspaceLabel: string;
  data?: SavedViewSettingsData;
  deleteSavedViewAction?: DeleteWorkspaceSavedViewAction;
  onDataChange(data: SavedViewSettingsData): void;
  reorderSavedViewsAction?: ReorderWorkspaceSavedViewsAction;
  saveSavedViewAction?: SaveWorkspaceSavedViewAction;
  setDefaultSavedViewAction?: SetDefaultWorkspaceSavedViewAction;
  userRole: AuthUserRole;
}) {
  const [selectedId, setSelectedId] = useState<string | undefined>(
    () => data?.views[0]?.id,
  );
  const [draft, setDraft] = useState(() =>
    data?.views[0] ? savedViewDraftFromView(data.views[0]) : newSavedViewDraft(),
  );
  const [deleteConfirmId, setDeleteConfirmId] = useState<string>();
  const [message, setMessage] = useState<{ ok: boolean; text: string }>();
  const [pendingKey, setPendingKey] = useState<string>();
  const [isPending, startTransition] = useTransition();
  const pending = Boolean(pendingKey) || isPending;

  const views = data?.views ?? [];
  const selectedView = views.find((view) => view.id === selectedId);

  const iconOptions = useMemo(
    () =>
      curatedSavedViewIconNames.map((name) => ({
        value: name,
        label: name,
        icon: <ViewIcon iconName={name} />,
      })),
    [],
  );

  function applyResult(result: { ok: boolean; code: string; data: SavedViewSettingsData }) {
    onDataChange(result.data);
    const nextSelected =
      result.data.views.find((view) => view.id === selectedId) ??
      result.data.views[0];
    setSelectedId(nextSelected?.id);
    setDraft(nextSelected ? savedViewDraftFromView(nextSelected) : newSavedViewDraft());
    setMessage({
      ok: result.ok,
      text: savedViewMutationMessages[result.code] ?? "Saved views updated.",
    });
  }

  function runAction(
    key: string,
    action: (() => Promise<{ ok: boolean; code: string; data: SavedViewSettingsData }>) | undefined,
  ) {
    if (!action) {
      return;
    }
    setPendingKey(key);
    startTransition(() => {
      void action()
        .then(applyResult)
        .finally(() => setPendingKey(undefined));
    });
  }

  function saveDraft() {
    if (!saveSavedViewAction) {
      return;
    }
    runAction("save", () =>
      saveSavedViewAction({
        ...draft,
        makeDefault: selectedView?.isDefault,
      }),
    );
  }

  function deleteView(view: SavedViewSettingsView) {
    if (deleteConfirmId !== view.id) {
      setDeleteConfirmId(view.id);
      return;
    }
    if (!deleteSavedViewAction) {
      return;
    }
    runAction(`delete-${view.id}`, () => deleteSavedViewAction(view.id));
  }

  function setDefault(view: SavedViewSettingsView) {
    if (!setDefaultSavedViewAction) {
      return;
    }
    runAction(`default-${view.id}`, () => setDefaultSavedViewAction(view.id));
  }

  function moveView(view: SavedViewSettingsView, offset: number) {
    const index = views.findIndex((item) => item.id === view.id);
    const target = index + offset;
    if (index === -1 || target < 0 || target >= views.length) {
      return;
    }
    const next = [...views];
    next.splice(index, 1);
    next.splice(target, 0, view);
    if (!reorderSavedViewsAction) {
      return;
    }
    runAction("reorder", () =>
      reorderSavedViewsAction(next.map((item) => item.id)),
    );
  }

  if (!data) {
    return (
      <section className="flex min-h-0 flex-1 items-center justify-center">
        <p className="text-sm text-slate-500">Loading views...</p>
      </section>
    );
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-slate-950">Views</h3>
            <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600">
              {activeWorkspaceLabel}
            </span>
          </div>
          <p className="text-sm text-slate-600">
            Create and manage ticket list views for this workspace.
          </p>
        </div>
        <Button
          onClick={() => {
            setSelectedId(undefined);
            setDraft(newSavedViewDraft());
            setDeleteConfirmId(undefined);
          }}
          type="button"
          variant="primary"
        >
          New view
        </Button>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-[20rem_minmax(0,1fr)]">
        <aside className="min-h-0 overflow-y-auto border-r border-slate-200 bg-slate-50 p-4">
          <ViewsList
            onMove={moveView}
            onSelect={(view) => {
              setSelectedId(view.id);
              setDraft(savedViewDraftFromView(view));
              setDeleteConfirmId(undefined);
            }}
            pending={pending}
            selectedId={selectedId}
            views={views}
          />
        </aside>
        <div className="min-h-0 overflow-y-auto px-5 py-4">
          {message ? (
            <div
              className={cn(
                "mb-4 rounded-md border px-3 py-2 text-sm",
                message.ok
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-rose-200 bg-rose-50 text-rose-800",
              )}
              role="status"
            >
              {message.text}
            </div>
          ) : null}

          <ViewDetailsForm
            draft={draft}
            iconOptions={iconOptions}
            setDraft={setDraft}
            userRole={userRole}
          />

          <ViewConditionsEditor
            conditions={draft.conditions}
            data={data}
            onConditionsChange={(conditions) =>
              setDraft((current) => ({ ...current, conditions }))
            }
          />

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
            <div className="flex gap-2">
              {selectedView ? (
                <>
                  <Button
                    disabled={selectedView.isDefault || pending}
                    icon={<Check aria-hidden="true" className="size-4" />}
                    loading={pendingKey === `default-${selectedView.id}`}
                    onClick={() => setDefault(selectedView)}
                    type="button"
                  >
                    Set default
                  </Button>
                  <Button
                    className="border-rose-200 text-rose-700 hover:bg-rose-50"
                    disabled={
                      selectedView.isDefault ||
                      pending ||
                      !canManageSavedView(selectedView, userRole)
                    }
                    loading={pendingKey === `delete-${selectedView.id}`}
                    onClick={() => deleteView(selectedView)}
                    type="button"
                  >
                    {deleteConfirmId === selectedView.id ? "Confirm delete" : "Delete"}
                  </Button>
                </>
              ) : null}
            </div>
            <Button
              disabled={pending || !draft.name.trim() || draft.conditions.length === 0}
              loading={pendingKey === "save"}
              onClick={saveDraft}
              type="button"
              variant="primary"
            >
              Save view
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
