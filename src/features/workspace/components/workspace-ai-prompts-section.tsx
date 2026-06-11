"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { Button, Checkbox } from "@/components/ui";
import type {
  AiPromptActionResult,
  AiPromptCenterData,
  LoadAiPromptCenterAction,
  ResetUserAiPromptOverrideAction,
  ResetWorkspaceAiPromptAction,
  SaveAiPromptOverridePolicyAction,
  SaveUserAiPromptOverrideAction,
  SaveWorkspaceAiPromptAction,
} from "@/features/ai";
import {
  PromptMessage,
  UserPromptForm,
  WorkspacePromptForm,
  promptMessageText,
} from "./workspace-ai-prompt-forms";

export function AiPromptsSection({
  data,
  loadAction,
  onDataChange,
  resetUserAiPromptOverrideAction,
  resetWorkspaceAiPromptAction,
  saveAiPromptOverridePolicyAction,
  saveUserAiPromptOverrideAction,
  saveWorkspaceAiPromptAction,
}: {
  data?: AiPromptCenterData;
  loadAction?: LoadAiPromptCenterAction;
  onDataChange(data: AiPromptCenterData): void;
  resetUserAiPromptOverrideAction?: ResetUserAiPromptOverrideAction;
  resetWorkspaceAiPromptAction?: ResetWorkspaceAiPromptAction;
  saveAiPromptOverridePolicyAction?: SaveAiPromptOverridePolicyAction;
  saveUserAiPromptOverrideAction?: SaveUserAiPromptOverrideAction;
  saveWorkspaceAiPromptAction?: SaveWorkspaceAiPromptAction;
}) {
  const [message, setMessage] = useState<{ ok: boolean; text: string }>();
  const [policyPending, startPolicyTransition] = useTransition();

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

  function savePolicy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!saveAiPromptOverridePolicyAction) {
      return;
    }
    const formData = new FormData(event.currentTarget);
    startPolicyTransition(() => {
      void saveAiPromptOverridePolicyAction(formData).then(applyResult);
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
        <h3 className="text-lg font-semibold text-slate-950">Prompt Center</h3>
        <p className="text-sm text-slate-600">
          {data.activeWorkspace?.label ?? "No active workspace"}
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
            <form
              className="rounded-md border border-slate-200 bg-white p-4"
              key={`${data.activeWorkspace?.id ?? "none"}-${data.allowUserPromptOverrides}`}
              onSubmit={savePolicy}
            >
              <Checkbox
                defaultChecked={data.allowUserPromptOverrides}
                disabled={policyPending || !saveAiPromptOverridePolicyAction}
                helpText="Saved personal prompts stay stored when this is turned off."
                label="Allow personal prompt overrides"
                name="allowUserPromptOverrides"
              />
              <div className="mt-4 flex justify-end">
                <Button
                  disabled={policyPending || !saveAiPromptOverridePolicyAction}
                  loading={policyPending}
                  type="submit"
                  variant="primary"
                >
                  Save policy
                </Button>
              </div>
            </form>
            {data.adminPrompts.map((prompt) => (
              <WorkspacePromptForm
                action={saveWorkspaceAiPromptAction}
                key={prompt.key}
                onResult={applyResult}
                prompt={prompt}
                resetAction={resetWorkspaceAiPromptAction}
              />
            ))}
          </div>
        ) : data.userPrompts.length > 0 ? (
          <div className="space-y-4">
            {data.userPrompts.map((prompt) => (
              <UserPromptForm
                action={saveUserAiPromptOverrideAction}
                key={prompt.key}
                onResult={applyResult}
                prompt={prompt}
                resetAction={resetUserAiPromptOverrideAction}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
            No personal prompts are available.
          </div>
        )}
      </div>
    </section>
  );
}
