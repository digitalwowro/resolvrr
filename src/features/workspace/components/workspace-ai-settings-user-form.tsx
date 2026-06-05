"use client";

import { useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui";
import type {
  SaveUserWorkspaceAiSettingsAction,
  WorkspaceAiSettingsActionResult,
  WorkspaceAiSettingsData,
} from "@/features/ai";
import { WorkspaceAiSettingsFields } from "./workspace-ai-settings-fields";

export function WorkspaceAiSettingsUserForm({
  action,
  data,
  onResult,
}: {
  action?: SaveUserWorkspaceAiSettingsAction;
  data: WorkspaceAiSettingsData;
  onResult(result: WorkspaceAiSettingsActionResult): void;
}) {
  const [pending, startTransition] = useTransition();
  const disabled = pending || !action || !data.activeWorkspace;

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

  return (
    <form
      className="rounded-md border border-slate-200 bg-white p-4"
      key={`${data.activeWorkspace?.id ?? "none"}-${data.userConfig?.hasApiKey ?? false}`}
      onSubmit={submit}
    >
      <WorkspaceAiSettingsFields config={data.userConfig} disabled={disabled} />
      <div className="mt-6 flex justify-end">
        <Button disabled={disabled} loading={pending} type="submit" variant="primary">
          Save and test
        </Button>
      </div>
    </form>
  );
}
