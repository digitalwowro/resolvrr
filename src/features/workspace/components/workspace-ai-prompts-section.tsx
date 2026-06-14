"use client";

import { useEffect, useState } from "react";
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
  }

  if (!data) {
    return (
      <section className="flex min-h-0 flex-1 items-center justify-center">
        <p className="text-sm text-slate-500">Loading prompts...</p>
      </section>
    );
  }

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
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <PromptMessage message={message} />
        {!data.canView ? (
          <div className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
            AI prompts are not available for this workspace.
          </div>
        ) : data.canManageWorkspace ? (
          <div className="space-y-4">
            <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              These base prompts and guardrail instructions control workspace AI
              safety behavior. Changes apply to all users in this workspace.
            </div>
            {data.adminPrompts.map((prompt) => (
              <WorkspacePromptForm
                action={saveWorkspaceAiPromptAction}
                key={prompt.key}
                onResult={applyResult}
                prompt={prompt}
                resetAction={resetWorkspaceAiPromptAction}
              />
            ))}
            <section className="space-y-3">
              <div>
                <h4 className="text-sm font-semibold text-slate-950">
                  Rephrase styles
                </h4>
                <p className="text-sm text-slate-600">
                  Create the style options shown in the reply editor.
                </p>
              </div>
              {data.workspaceRephraseStyles.map((style) => (
                <WorkspaceRephraseStyleForm
                  action={saveWorkspaceAiRephraseStyleAction}
                  deleteAction={deleteWorkspaceAiRephraseStyleAction}
                  key={style.id}
                  moveAction={moveWorkspaceAiRephraseStyleAction}
                  onResult={applyResult}
                  style={style}
                />
              ))}
              <NewWorkspaceRephraseStyleForm
                action={saveWorkspaceAiRephraseStyleAction}
                onResult={applyResult}
              />
            </section>
          </div>
        ) : data.userRephraseStyleOverrides.length > 0 ? (
          <div className="space-y-4">
            {data.userRephraseStyleOverrides.map((style) => (
              <UserRephraseStyleOverrideForm
                action={saveUserAiRephraseStyleOverrideAction}
                key={style.id}
                onResult={applyResult}
                resetAction={resetUserAiRephraseStyleOverrideAction}
                style={style}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
            No personal rephrase style overrides are available.
          </div>
        )}
      </div>
    </section>
  );
}
