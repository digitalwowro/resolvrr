"use client";

import {
  WorkspaceSettingsMyStyleForm,
  type LoadMyStyleAction,
  type ResetMyStyleAction,
  type SaveMyStyleAction,
} from "./workspace-settings-my-style-form";

export type {
  LoadMyStyleAction,
  ResetMyStyleAction,
  SaveMyStyleAction,
} from "./workspace-settings-my-style-form";

type WorkspaceSettingsMyStyleSectionProps = {
  loadMyStyleAction?: LoadMyStyleAction;
  resetMyStyleAction?: ResetMyStyleAction;
  saveMyStyleAction?: SaveMyStyleAction;
};

export function WorkspaceSettingsMyStyleSection({
  loadMyStyleAction,
  resetMyStyleAction,
  saveMyStyleAction,
}: WorkspaceSettingsMyStyleSectionProps) {
  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-slate-200 px-5 py-4">
        <h3 className="text-lg font-semibold text-slate-950">My Style</h3>
        <p className="text-sm text-slate-600">
          Manage your personal writing guidance for the active workspace.
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <WorkspaceSettingsMyStyleForm
          loadMyStyleAction={loadMyStyleAction}
          resetMyStyleAction={resetMyStyleAction}
          saveMyStyleAction={saveMyStyleAction}
        />
      </div>
    </section>
  );
}
