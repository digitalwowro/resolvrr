"use client";

import {
  CheckCircle2,
  CircleAlert,
  CircleOff,
  PlugZap,
} from "lucide-react";
import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { cn } from "@/components/ui/classnames";
import { helpdeskConnectionMessage } from "@/features/helpdesk-connections/messages";
import type {
  ConnectionProviderOption,
  HelpdeskConnectionActionResult,
  HelpdeskConnectionFormAction,
  WorkspaceSettingsConnection,
} from "@/features/helpdesk-connections/service-types";

type EditingState =
  | { mode: "create" }
  | { mode: "edit"; connection: WorkspaceSettingsConnection }
  | null;

const statusLabel: Record<WorkspaceSettingsConnection["status"], string> = {
  active: "Active",
  disconnected: "Disconnected",
  auth_failed: "Auth failed",
};

const statusIcon = {
  active: CheckCircle2,
  disconnected: CircleOff,
  auth_failed: CircleAlert,
};

function connectionStatus(connection: WorkspaceSettingsConnection) {
  return connection.status;
}

function formDataWithConnectionId(connectionId: string) {
  const formData = new FormData();
  formData.set("connectionId", connectionId);
  return formData;
}

function firstScheme(provider?: ConnectionProviderOption) {
  return provider?.credentialSchemes[0];
}

function WorkspaceConnectionForm({
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
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Provider</span>
          <select
            className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50"
            disabled={editing || pending}
            name={editing ? undefined : "providerKey"}
            onChange={(event) => setProviderKey(event.currentTarget.value)}
            required
            value={providerKey}
          >
            {providers.map((provider) => (
              <option key={provider.key} value={provider.key}>
                {provider.label}
              </option>
            ))}
          </select>
          {editing ? <input name="providerKey" type="hidden" value={providerKey} /> : null}
        </label>
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

export function WorkspacesSection({
  connections,
  createConnectionAction,
  deleteConnectionAction,
  disableConnectionAction,
  onConnectionsChange,
  providerOptions,
  setActiveConnectionAction,
  updateConnectionAction,
  validateConnectionAction,
}: {
  connections: WorkspaceSettingsConnection[];
  createConnectionAction?: HelpdeskConnectionFormAction;
  deleteConnectionAction?: HelpdeskConnectionFormAction;
  disableConnectionAction?: HelpdeskConnectionFormAction;
  onConnectionsChange(connections: WorkspaceSettingsConnection[]): void;
  providerOptions: ConnectionProviderOption[];
  setActiveConnectionAction?: HelpdeskConnectionFormAction;
  updateConnectionAction?: HelpdeskConnectionFormAction;
  validateConnectionAction?: HelpdeskConnectionFormAction;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<EditingState>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const pending = Boolean(pendingKey) || isPending;

  function applyResult(result: HelpdeskConnectionActionResult) {
    onConnectionsChange(result.connections);
    setMessage({
      ok: result.ok,
      text: helpdeskConnectionMessage(result.code) ?? "Workspace settings updated.",
    });
    if (result.ok) {
      setEditing(null);
      router.refresh();
    }
  }

  function runAction(
    key: string,
    action: HelpdeskConnectionFormAction | undefined,
    formData: FormData,
  ) {
    if (!action) {
      return;
    }
    setPendingKey(key);
    startTransition(() => {
      void action(formData)
        .then(applyResult)
        .finally(() => setPendingKey(null));
    });
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-950">Workspaces</h3>
          <p className="text-sm text-slate-600">
            Connect and manage the helpdesk workspaces available to your account.
          </p>
        </div>
        <Button
          disabled={pending || providerOptions.length === 0}
          onClick={() => setEditing({ mode: "create" })}
          type="button"
          variant="primary"
        >
          Add workspace
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {message ? (
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
        ) : null}

        {editing ? (
          <div className="mb-4">
            <WorkspaceConnectionForm
              action={
                editing.mode === "create"
                  ? createConnectionAction
                  : updateConnectionAction
              }
              connection={editing.mode === "edit" ? editing.connection : undefined}
              onCancel={() => setEditing(null)}
              onSubmitResult={applyResult}
              pending={pending}
              providers={providerOptions}
            />
          </div>
        ) : null}

        {connections.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-300 bg-white p-8 text-center">
            <PlugZap aria-hidden="true" className="mx-auto size-8 text-indigo-600" />
            <h4 className="mt-3 text-lg font-semibold text-slate-950">
              No workspaces connected
            </h4>
            <p className="mt-2 text-sm text-slate-600">
              Connect a helpdesk workspace before loading provider-backed tickets.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {connections.map((connection) => {
              const StatusIcon = statusIcon[connectionStatus(connection)];
              return (
                <article
                  className="rounded-md border border-slate-200 bg-white p-4"
                  key={connection.id}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-base font-semibold text-slate-950">
                          {connection.label}
                        </h4>
                        {connection.active ? (
                          <span className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700">
                            Active workspace
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-slate-600">
                        {connection.providerLabel} · {connection.baseUrl}
                      </p>
                      <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-slate-700">
                        <StatusIcon aria-hidden="true" className="size-4" />
                        {statusLabel[connectionStatus(connection)]}
                      </p>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        disabled={
                          pending ||
                          connection.active ||
                          connection.status !== "active"
                        }
                        loading={pendingKey === `active-${connection.id}`}
                        onClick={() =>
                          runAction(
                            `active-${connection.id}`,
                            setActiveConnectionAction,
                            formDataWithConnectionId(connection.id),
                          )
                        }
                        type="button"
                      >
                        Set active
                      </Button>
                      <Button
                        disabled={pending}
                        loading={pendingKey === `validate-${connection.id}`}
                        onClick={() =>
                          runAction(
                            `validate-${connection.id}`,
                            validateConnectionAction,
                            formDataWithConnectionId(connection.id),
                          )
                        }
                        type="button"
                      >
                        Validate
                      </Button>
                      {connection.status === "active" ? (
                        <Button
                          disabled={pending}
                          loading={pendingKey === `disable-${connection.id}`}
                          onClick={() =>
                            runAction(
                              `disable-${connection.id}`,
                              disableConnectionAction,
                              formDataWithConnectionId(connection.id),
                            )
                          }
                          type="button"
                        >
                          Disable
                        </Button>
                      ) : null}
                      <Button
                        disabled={pending}
                        onClick={() => setEditing({ mode: "edit", connection })}
                        type="button"
                      >
                        Edit
                      </Button>
                      <Button
                        className="border-rose-200 text-rose-700 hover:bg-rose-50"
                        disabled={pending}
                        loading={pendingKey === `delete-${connection.id}`}
                        onClick={() =>
                          runAction(
                            `delete-${connection.id}`,
                            deleteConnectionAction,
                            formDataWithConnectionId(connection.id),
                          )
                        }
                        type="button"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
