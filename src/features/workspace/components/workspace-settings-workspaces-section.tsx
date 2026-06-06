"use client";

import {
  CheckCircle2,
  CircleAlert,
  CircleOff,
  PlugZap,
} from "lucide-react";
import { useState, useTransition } from "react";
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
import { WorkspaceConnectionForm } from "./workspace-connection-form";

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

function activeConnection(connections: WorkspaceSettingsConnection[]) {
  return connections.find((connection) => connection.active) ?? null;
}

export function WorkspacesSection({
  connections,
  createConnectionAction,
  deleteConnectionAction,
  disableConnectionAction,
  onActiveWorkspaceChange,
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
  onActiveWorkspaceChange?(): void;
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
    const previousActive = activeConnection(connections);
    const nextActive = activeConnection(result.connections);
    onConnectionsChange(result.connections);
    setMessage({
      ok: result.ok,
      text: helpdeskConnectionMessage(result.code) ?? "Workspace settings updated.",
    });
    if (result.ok) {
      setEditing(null);
      if (
        previousActive?.id !== nextActive?.id ||
        previousActive?.label !== nextActive?.label
      ) {
        onActiveWorkspaceChange?.();
      }
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
