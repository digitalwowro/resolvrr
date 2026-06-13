"use client";

import { useState, type FormEvent } from "react";
import { Button, DropdownSelect, type DropdownOption } from "@/components/ui";
import type {
  ConnectionProviderOption,
  HelpdeskConnectionActionResult,
  HelpdeskConnectionFormAction,
  WorkspaceSettingsConnection,
} from "@/features/helpdesk-connections/service-types";

function firstScheme(provider?: ConnectionProviderOption) {
  return provider?.credentialSchemes[0];
}

export function WorkspaceConnectionForm({
  action,
  connection,
  onCancel,
  onSubmitResult,
  pending,
  providers,
}: {
  action?: HelpdeskConnectionFormAction;
  connection?: WorkspaceSettingsConnection;
  onCancel(): void;
  onSubmitResult(result: HelpdeskConnectionActionResult): void;
  pending: boolean;
  providers: ConnectionProviderOption[];
}) {
  const editing = Boolean(connection);
  const initialProviderKey = connection?.providerKey ?? providers[0]?.key ?? "";
  const [providerKey, setProviderKey] = useState(initialProviderKey);
  const selectedProvider =
    providers.find((provider) => provider.key === providerKey) ?? providers[0];
  const selectedScheme = firstScheme(selectedProvider);
  const canSubmit = Boolean(action && selectedProvider && selectedScheme && !pending);
  const providerOptions: DropdownOption[] = providers.map((provider) => ({
    value: provider.key,
    label: provider.label,
  }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!action) {
      return;
    }
    const result = await action(new FormData(event.currentTarget));
    onSubmitResult(result);
  }

  return (
    <form className="rounded-md border border-slate-200 bg-white p-4" onSubmit={submit}>
      {connection ? <input name="connectionId" type="hidden" value={connection.id} /> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Workspace name</span>
          <input
            className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            defaultValue={connection?.label}
            name="displayName"
            required
          />
        </label>
        <div className="block">
          <span className="text-sm font-medium text-slate-700">Provider</span>
          <input name="providerKey" type="hidden" value={providerKey} />
          <DropdownSelect
            ariaLabel="Provider"
            className="mt-1 block w-full [&>div]:w-full"
            disabled={editing || pending}
            onValueChange={setProviderKey}
            options={providerOptions}
            triggerClassName="h-10 w-full text-sm disabled:bg-slate-50"
            value={providerKey}
          />
        </div>
        <label className="block md:col-span-2">
          <span className="text-sm font-medium text-slate-700">Base URL</span>
          <input
            className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            defaultValue={connection?.baseUrl}
            name="baseUrl"
            placeholder="https://helpdesk.example.com"
            required
            type="url"
          />
        </label>
      </div>

      {selectedScheme ? (
        <fieldset className="mt-5 border-t border-slate-200 pt-4">
          <legend className="text-sm font-medium text-slate-700">
            {selectedScheme.label}
          </legend>
          <input name="credentialScheme" type="hidden" value={selectedScheme.key} />
          {editing ? (
            <p className="mt-1 text-sm text-slate-500">
              Credential fields are blank for security. Leave all blank to keep
              the current encrypted credentials.
            </p>
          ) : null}
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            {selectedScheme.fields.map((field) => (
              <label className="block" key={field.name}>
                <span className="text-sm font-medium text-slate-700">
                  {field.label}
                </span>
                <input
                  autoComplete="off"
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  name={field.name}
                  required={!editing && field.required}
                  type={field.type === "password" ? "password" : "text"}
                />
              </label>
            ))}
          </div>
        </fieldset>
      ) : (
        <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          No credential scheme is available for this provider.
        </p>
      )}

      <div className="mt-6 flex justify-end gap-2">
        <Button disabled={pending} onClick={onCancel} type="button">
          Cancel
        </Button>
        <Button disabled={!canSubmit} loading={pending} type="submit" variant="primary">
          {editing ? "Save workspace" : "Connect workspace"}
        </Button>
      </div>
    </form>
  );
}
