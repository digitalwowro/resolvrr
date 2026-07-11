"use client";

import { Trash2 } from "lucide-react";
import { useTransition, type FormEvent } from "react";
import { Button, Checkbox } from "@/components/ui";
import type {
  AiPromptActionResult,
  DeleteWorkspaceAiRephraseStyleAction,
  ResetUserAiRephraseStyleOverrideAction,
  SaveUserAiRephraseStyleOverrideAction,
  SaveWorkspaceAiRephraseStyleAction,
  UserAiRephraseStyleOverrideView,
  WorkspaceAiRephraseStyleView,
} from "@/features/ai";
import { textareaClass } from "./workspace-ai-prompt-forms";

export function WorkspaceRephraseStyleForm({
  action,
  deleteAction,
  onResult,
  style,
}: {
  action?: SaveWorkspaceAiRephraseStyleAction;
  deleteAction?: DeleteWorkspaceAiRephraseStyleAction;
  onResult(result: AiPromptActionResult): void;
  style: WorkspaceAiRephraseStyleView;
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

  function deleteStyle() {
    if (!deleteAction) {
      return;
    }
    startTransition(() => {
      void deleteAction(style.id).then(onResult);
    });
  }

  return (
    <form
      className="rounded-md border border-slate-200 bg-white p-4"
      key={`${style.id}-${style.prompt}`}
      onSubmit={submit}
    >
      <input name="styleId" type="hidden" value={style.id} />
      <div className="flex items-start justify-between gap-4">
        <label className="block flex-1 text-sm font-medium text-slate-700">
          Style name
          <input
            className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            defaultValue={style.label}
            disabled={disabled}
            maxLength={80}
            name="label"
            required
          />
        </label>
        <div className="pt-7">
          <button
            aria-label={`Remove ${style.label}`}
            className="grid size-9 place-items-center rounded-md text-slate-500 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-40"
            disabled={pending || !deleteAction}
            onClick={deleteStyle}
            type="button"
          >
            <Trash2 aria-hidden="true" className="size-4" />
          </button>
        </div>
      </div>
      <label className="mt-4 block text-sm font-medium text-slate-700">
        Style prompt
        <textarea
          className={textareaClass}
          defaultValue={style.prompt}
          disabled={disabled}
          maxLength={style.maxLength}
          name="prompt"
          required
        />
      </label>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <Checkbox
          defaultChecked={style.isEnabled}
          disabled={disabled}
          label="Enabled"
          name="isEnabled"
        />
        <Button disabled={disabled} loading={pending} type="submit" variant="primary">
          Save style
        </Button>
      </div>
    </form>
  );
}

export function NewWorkspaceRephraseStyleForm({
  action,
  onResult,
}: {
  action?: SaveWorkspaceAiRephraseStyleAction;
  onResult(result: AiPromptActionResult): void;
}) {
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!action) {
      return;
    }
    const form = event.currentTarget;
    startTransition(() => {
      void action(new FormData(form)).then((result) => {
        if (result.ok) {
          form.reset();
        }
        onResult(result);
      });
    });
  }

  return (
    <form
      className="rounded-md border border-dashed border-slate-300 bg-white p-4"
      onSubmit={submit}
    >
      <div>
        <h4 className="text-sm font-semibold text-slate-950">New rephrase style</h4>
        <p className="text-sm text-slate-600">
          Create a style option shown in the reply editor.
        </p>
      </div>
      <label className="mt-4 block text-sm font-medium text-slate-700">
        Style name
        <input
          className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          disabled={pending || !action}
          maxLength={80}
          name="label"
          required
        />
      </label>
      <label className="mt-4 block text-sm font-medium text-slate-700">
        Style prompt
        <textarea
          className={textareaClass}
          disabled={pending || !action}
          maxLength={2_000}
          name="prompt"
          required
        />
      </label>
      <div className="mt-4 flex justify-end">
        <Button disabled={pending || !action} loading={pending} type="submit" variant="primary">
          Add style
        </Button>
      </div>
    </form>
  );
}

export function UserRephraseStyleOverrideForm({
  action,
  onResult,
  resetAction,
  style,
}: {
  action?: SaveUserAiRephraseStyleOverrideAction;
  onResult(result: AiPromptActionResult): void;
  resetAction?: ResetUserAiRephraseStyleOverrideAction;
  style: UserAiRephraseStyleOverrideView;
}) {
  const [pending, startTransition] = useTransition();
  const disabled = pending || !action;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!action) {
      return;
    }
    startTransition(() => {
      void action(new FormData(event.currentTarget)).then(onResult);
    });
  }

  function resetStyle() {
    if (!resetAction) {
      return;
    }
    startTransition(() => {
      void resetAction(style.id).then(onResult);
    });
  }

  return (
    <form
      className="rounded-md border border-slate-200 bg-white p-4"
      key={`${style.id}-${style.prompt}`}
      onSubmit={submit}
    >
      <input name="styleId" type="hidden" value={style.id} />
      <h4 className="text-sm font-semibold text-slate-950">{style.label}</h4>
      <p className="text-sm text-slate-600">
        Replace this workspace style for your own drafts.
      </p>
      <label className="mt-4 block text-sm font-medium text-slate-700">
        Personal style prompt
        <textarea
          className={textareaClass}
          defaultValue={style.prompt}
          disabled={disabled}
          maxLength={style.maxLength}
          name="prompt"
          required
        />
      </label>
      <div className="mt-4 flex justify-end gap-2">
        <Button
          disabled={pending || !resetAction || !style.isCustomized}
          onClick={resetStyle}
          type="button"
          variant="secondary"
        >
          Reset
        </Button>
        <Button disabled={disabled} loading={pending} type="submit" variant="primary">
          Save personal style
        </Button>
      </div>
    </form>
  );
}
