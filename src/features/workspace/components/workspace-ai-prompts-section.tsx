"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { Button, Checkbox } from "@/components/ui";
import { cn } from "@/components/ui/classnames";
import type {
  AiPromptActionCode,
  AiPromptActionResult,
  AiPromptAdminView,
  AiPromptCenterData,
  AiPromptKey,
  AiPromptUserView,
  LoadAiPromptCenterAction,
  ResetUserAiPromptOverrideAction,
  ResetWorkspaceAiPromptAction,
  SaveAiPromptOverridePolicyAction,
  SaveUserAiPromptOverrideAction,
  SaveWorkspaceAiPromptAction,
} from "@/features/ai";

const textareaClass =
  "mt-2 min-h-40 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50";

const messageText: Record<AiPromptActionCode, string> = {
  "ai-disabled": "AI is disabled for this workspace.",
  "ai-prompt-policy-saved": "Prompt policy saved.",
  "ai-prompt-reset": "Prompt reset.",
  "ai-prompt-saved": "Prompt saved.",
  "ai-user-prompt-reset": "Personal prompt reset.",
  "ai-user-prompt-saved": "Personal prompt saved.",
  "invalid-ai-prompt": "Check the prompt text.",
  "invalid-ai-prompt-input": "Check the selected prompt.",
  "no-active-workspace": "Select an active workspace first.",
  "not-admin": "Only admins can manage workspace prompts.",
  "prompt-not-user-editable": "This prompt is not editable for your account.",
};

function PromptMessage({
  message,
}: {
  message?: { ok: boolean; text: string };
}) {
  return message ? (
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
  ) : null;
}

function WorkspacePromptForm({
  action,
  onResult,
  prompt,
  resetAction,
}: {
  action?: SaveWorkspaceAiPromptAction;
  onResult(result: AiPromptActionResult): void;
  prompt: AiPromptAdminView;
  resetAction?: ResetWorkspaceAiPromptAction;
}) {
  const [pending, startTransition] = useTransition();
  const disabled = pending || !action;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!action) {
      return;
    }
    const formData = new FormData(event.currentTarget);
    startTransition(() => {
      void action(formData).then(onResult);
    });
  }

  function resetPrompt() {
    if (!resetAction) {
      return;
    }
    startTransition(() => {
      void resetAction(prompt.key).then(onResult);
    });
  }

  return (
    <form
      className="rounded-md border border-slate-200 bg-white p-4"
      key={`${prompt.key}-${prompt.prompt}`}
      onSubmit={submit}
    >
      <input name="promptKey" type="hidden" value={prompt.key} />
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 className="text-sm font-semibold text-slate-950">{prompt.label}</h4>
          <p className="text-sm text-slate-600">{prompt.description}</p>
        </div>
        {prompt.isCustomized ? (
          <span className="rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700">
            Custom
          </span>
        ) : null}
      </div>
      <label className="mt-4 block text-sm font-medium text-slate-700">
        Prompt
        <textarea
          className={textareaClass}
          defaultValue={prompt.prompt}
          disabled={disabled}
          maxLength={prompt.maxLength}
          name="prompt"
          required
        />
      </label>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">Limit {prompt.maxLength} characters.</p>
        <div className="flex gap-2">
          <Button
            disabled={pending || !resetAction || !prompt.isCustomized}
            onClick={resetPrompt}
            type="button"
            variant="secondary"
          >
            Reset
          </Button>
          <Button disabled={disabled} loading={pending} type="submit" variant="primary">
            Save prompt
          </Button>
        </div>
      </div>
    </form>
  );
}

function UserPromptForm({
  action,
  onResult,
  prompt,
  resetAction,
}: {
  action?: SaveUserAiPromptOverrideAction;
  onResult(result: AiPromptActionResult): void;
  prompt: AiPromptUserView;
  resetAction?: ResetUserAiPromptOverrideAction;
}) {
  const [pending, startTransition] = useTransition();
  const disabled = pending || !action;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!action) {
      return;
    }
    const formData = new FormData(event.currentTarget);
    startTransition(() => {
      void action(formData).then(onResult);
    });
  }

  function resetPrompt(promptKey: AiPromptKey) {
    if (!resetAction) {
      return;
    }
    startTransition(() => {
      void resetAction(promptKey).then(onResult);
    });
  }

  return (
    <form
      className="rounded-md border border-slate-200 bg-white p-4"
      key={`${prompt.key}-${prompt.prompt}`}
      onSubmit={submit}
    >
      <input name="promptKey" type="hidden" value={prompt.key} />
      <h4 className="text-sm font-semibold text-slate-950">{prompt.label}</h4>
      <p className="text-sm text-slate-600">{prompt.description}</p>
      <label className="mt-4 block text-sm font-medium text-slate-700">
        Personal prompt
        <textarea
          className={textareaClass}
          defaultValue={prompt.prompt}
          disabled={disabled}
          maxLength={prompt.maxLength}
          name="prompt"
          required
        />
      </label>
      <div className="mt-4 flex justify-end gap-2">
        <Button
          disabled={pending || !resetAction || !prompt.isCustomized}
          onClick={() => resetPrompt(prompt.key)}
          type="button"
          variant="secondary"
        >
          Reset
        </Button>
        <Button disabled={disabled} loading={pending} type="submit" variant="primary">
          Save personal prompt
        </Button>
      </div>
    </form>
  );
}

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
      text: messageText[result.code],
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
