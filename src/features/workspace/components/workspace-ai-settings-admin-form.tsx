"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Button, DropdownSelect, type DropdownOption } from "@/components/ui";
import type {
  SaveWorkspaceAiSettingsAction,
  WorkspaceAiPolicy,
  WorkspaceAiSettingsActionResult,
  WorkspaceAiSettingsData,
} from "@/features/ai";
import { WorkspaceAiSettingsFields } from "./workspace-ai-settings-fields";

const inputClass =
  "mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50";

const workspaceAiPolicyOptions: Array<
  DropdownOption & { value: WorkspaceAiPolicy }
> = [
  { label: "Disabled", value: "disabled" },
  { label: "Use workspace key", value: "admin-managed" },
  { label: "Users provide keys", value: "user-provided" },
];

export function WorkspaceAiSettingsAdminForm({
  action,
  data,
  onResult,
}: {
  action?: SaveWorkspaceAiSettingsAction;
  data: WorkspaceAiSettingsData;
  onResult(result: WorkspaceAiSettingsActionResult): void;
}) {
  const policyKey = `${data.activeWorkspace?.id ?? "none"}-${data.policy}`;
  const [policyDraft, setPolicyDraft] = useState<{
    key: string;
    value: WorkspaceAiPolicy;
  }>({ key: policyKey, value: data.policy });
  const policy = policyDraft.key === policyKey ? policyDraft.value : data.policy;
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
      key={`${data.activeWorkspace?.id ?? "none"}-${data.policy}-${data.workspaceConfig?.hasApiKey ?? false}`}
      onSubmit={submit}
    >
      <div className="block">
        <input name="policy" type="hidden" value={policy} />
        <DropdownSelect
          ariaLabel="Workspace AI"
          className="block w-full [&>div]:w-full"
          disabled={disabled}
          label="Workspace AI"
          onValueChange={(value) =>
            setPolicyDraft({
              key: policyKey,
              value: value as WorkspaceAiPolicy,
            })
          }
          options={workspaceAiPolicyOptions}
          triggerClassName={inputClass}
          value={policy}
        />
      </div>
      {policy === "admin-managed" ? (
        <fieldset className="mt-5 border-t border-slate-200 pt-4">
          <legend className="text-sm font-medium text-slate-700">
            Workspace default
          </legend>
          <div className="mt-3">
            <WorkspaceAiSettingsFields
              config={data.workspaceConfig}
              disabled={disabled}
            />
          </div>
        </fieldset>
      ) : null}
      <div className="mt-6 flex justify-end">
        <Button disabled={disabled} loading={pending} type="submit" variant="primary">
          Save and test
        </Button>
      </div>
    </form>
  );
}
