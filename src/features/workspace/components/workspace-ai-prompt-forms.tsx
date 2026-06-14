"use client";

import { useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui";
import { cn } from "@/components/ui/classnames";
import type {
  AiPromptActionCode,
  AiPromptActionResult,
  AiPromptAdminView,
  ResetWorkspaceAiPromptAction,
  SaveWorkspaceAiPromptAction,
} from "@/features/ai";

const textareaClass =
  "mt-2 min-h-40 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50";

export const promptMessageText: Record<AiPromptActionCode, string> = {
  "ai-disabled": "AI is disabled for this workspace.",
  "ai-prompt-reset": "Prompt reset.",
  "ai-prompt-saved": "Prompt saved.",
  "ai-rephrase-style-created": "Rephrase style created.",
  "ai-rephrase-style-deleted": "Rephrase style removed.",
  "ai-rephrase-style-moved": "Rephrase style order updated.",
  "ai-rephrase-style-override-reset": "Personal style override reset.",
  "ai-rephrase-style-override-saved": "Personal style override saved.",
  "ai-rephrase-style-saved": "Rephrase style saved.",
  "invalid-ai-prompt": "Check the prompt text.",
  "invalid-ai-prompt-input": "Check the selected prompt.",
  "invalid-ai-rephrase-style": "Check the style name and prompt.",
  "no-active-workspace": "Select an active workspace first.",
  "not-admin": "Only admins can manage workspace prompts.",
  "style-not-user-editable": "This style is not editable for your account.",
};

export function PromptMessage({
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

export function WorkspacePromptForm({
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

export { textareaClass };
