"use client";

import { useEffect, useState, useTransition } from "react";
import type {
  AiPromptActionResult,
  AiPromptCenterData,
  DeleteWorkspaceAiRephraseStyleAction,
  LoadAiPromptCenterAction,
  MoveWorkspaceAiRephraseStyleAction,
  ResetUserAiRephraseStyleOverrideAction,
  ResetWorkspaceAiPromptAction,
  SaveUserAiRephraseStyleOverrideAction,
  SaveWorkspaceAiRephraseStyleAction,
  SaveWorkspaceAiPromptAction,
} from "@/features/ai";
import {
  PromptMessage,
  WorkspacePromptForm,
  promptMessageText,
} from "./workspace-ai-prompt-forms";
import {
  PromptCenterSidebar,
  firstPromptCenterSelection,
  promptCenterSelectionExists,
  promptCenterSelectionKey,
  type PromptCenterSelection,
} from "./workspace-ai-prompt-center-sidebar";
import {
  NewWorkspaceRephraseStyleForm,
  UserRephraseStyleOverrideForm,
  WorkspaceRephraseStyleForm,
} from "./workspace-ai-rephrase-style-forms";

export function AiPromptsSection({
  data,
  deleteWorkspaceAiRephraseStyleAction,
  loadAction,
  moveWorkspaceAiRephraseStyleAction,
  onDataChange,
  resetUserAiRephraseStyleOverrideAction,
  resetWorkspaceAiPromptAction,
  saveUserAiRephraseStyleOverrideAction,
  saveWorkspaceAiRephraseStyleAction,
  saveWorkspaceAiPromptAction,
}: {
  data?: AiPromptCenterData;
  deleteWorkspaceAiRephraseStyleAction?: DeleteWorkspaceAiRephraseStyleAction;
  loadAction?: LoadAiPromptCenterAction;
  moveWorkspaceAiRephraseStyleAction?: MoveWorkspaceAiRephraseStyleAction;
  onDataChange(data: AiPromptCenterData): void;
  resetUserAiRephraseStyleOverrideAction?: ResetUserAiRephraseStyleOverrideAction;
  resetWorkspaceAiPromptAction?: ResetWorkspaceAiPromptAction;
  saveUserAiRephraseStyleOverrideAction?: SaveUserAiRephraseStyleOverrideAction;
  saveWorkspaceAiRephraseStyleAction?: SaveWorkspaceAiRephraseStyleAction;
  saveWorkspaceAiPromptAction?: SaveWorkspaceAiPromptAction;
}) {
  const [message, setMessage] = useState<{ ok: boolean; text: string }>();
  const [selected, setSelected] = useState<PromptCenterSelection>();
  const [pendingKey, setPendingKey] = useState<string>();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (data || !loadAction) {
      return;
    }
    void loadAction().then(onDataChange);
  }, [data, loadAction, onDataChange]);

  function applyResult(result: AiPromptActionResult) {
    onDataChange(result.data);
    setMessage({
      ok: result.ok,
      text: promptMessageText[result.code],
    });
    if (!result.ok) {
      return;
    }
    if (result.code === "ai-rephrase-style-created") {
      const created = result.data.workspaceRephraseStyles.at(-1);
      setSelected(created ? { id: created.id, type: "style" } : undefined);
    } else if (result.code === "ai-rephrase-style-deleted") {
      setSelected(undefined);
    }
  }

  function moveStyle(styleId: string, direction: "down" | "up") {
    if (!moveWorkspaceAiRephraseStyleAction) {
      return;
    }
    setPendingKey(`move-${styleId}`);
    startTransition(() => {
      void moveWorkspaceAiRephraseStyleAction(styleId, direction)
        .then(applyResult)
        .finally(() => setPendingKey(undefined));
    });
  }

  if (!data) {
    return (
      <section className="flex min-h-0 flex-1 items-center justify-center">
        <p className="text-sm text-slate-500">Loading prompts...</p>
      </section>
    );
  }

  const selectionInput = {
    canManageWorkspace: data.canManageWorkspace,
    overrides: data.userRephraseStyleOverrides,
    prompts: data.adminPrompts,
    styles: data.workspaceRephraseStyles,
  };
  const effectiveSelected =
    data.canView && promptCenterSelectionExists(selected, selectionInput)
      ? selected
      : data.canView
        ? firstPromptCenterSelection(selectionInput)
        : undefined;
  const selectedKey = effectiveSelected
    ? promptCenterSelectionKey(effectiveSelected)
    : undefined;

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-slate-200 px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-semibold text-slate-950">Prompt Center</h3>
          <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600">
            {data.activeWorkspace?.label ?? "No active workspace"}
          </span>
        </div>
        <p className="text-sm text-slate-600">
          Review and tune the prompts used by this workspace.
        </p>
      </div>
      {!data.canView ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
            AI prompts are not available for this workspace.
          </div>
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-[20rem_minmax(0,1fr)]">
          <aside className="min-h-0 overflow-y-auto border-r border-slate-200 bg-slate-50 p-4">
            <PromptCenterSidebar
              canManageWorkspace={data.canManageWorkspace}
              onMoveStyle={moveStyle}
              onSelect={setSelected}
              pending={Boolean(pendingKey) || isPending}
              prompts={data.adminPrompts}
              selectedKey={selectedKey}
              styles={data.workspaceRephraseStyles}
              userOverrides={data.userRephraseStyleOverrides}
            />
          </aside>
          <div className="min-h-0 overflow-y-auto px-5 py-4">
            <PromptMessage message={message} />
            {data.canManageWorkspace ? (
              <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                These base prompts and guardrail instructions control workspace
                AI safety behavior. Changes apply to all users in this workspace.
              </div>
            ) : null}
            {effectiveSelected?.type === "prompt" ? (
              data.adminPrompts
                .filter((prompt) => prompt.key === effectiveSelected.id)
                .map((prompt) => (
                  <WorkspacePromptForm
                    action={saveWorkspaceAiPromptAction}
                    key={prompt.key}
                    onResult={applyResult}
                    prompt={prompt}
                    resetAction={resetWorkspaceAiPromptAction}
                  />
                ))
            ) : effectiveSelected?.type === "style" ? (
              data.workspaceRephraseStyles
                .filter((style) => style.id === effectiveSelected.id)
                .map((style) => (
                  <WorkspaceRephraseStyleForm
                    action={saveWorkspaceAiRephraseStyleAction}
                    deleteAction={deleteWorkspaceAiRephraseStyleAction}
                    key={style.id}
                    onResult={applyResult}
                    style={style}
                  />
                ))
            ) : effectiveSelected?.type === "new-style" && data.canManageWorkspace ? (
              <NewWorkspaceRephraseStyleForm
                action={saveWorkspaceAiRephraseStyleAction}
                onResult={applyResult}
              />
            ) : effectiveSelected?.type === "override" ? (
              data.userRephraseStyleOverrides
                .filter((style) => style.id === effectiveSelected.id)
                .map((style) => (
                  <UserRephraseStyleOverrideForm
                    action={saveUserAiRephraseStyleOverrideAction}
                    key={style.id}
                    onResult={applyResult}
                    resetAction={resetUserAiRephraseStyleOverrideAction}
                    style={style}
                  />
                ))
            ) : (
              <div className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                Select a prompt or style to edit.
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
