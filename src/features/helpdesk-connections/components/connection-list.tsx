import Link from "next/link";
import type { ReactNode } from "react";
import {
  CheckCircle2,
  CircleAlert,
  CircleOff,
  PlugZap,
  Trash2,
} from "lucide-react";
import type { ConnectionListItem } from "../service";
import {
  deleteHelpdeskConnectionAction,
  disableHelpdeskConnectionAction,
  setActiveHelpdeskConnectionAction,
  validateHelpdeskConnectionAction,
} from "../actions";

type ConnectionListProps = {
  connections: ConnectionListItem[];
};

const statusLabel = {
  active: "Active",
  disconnected: "Disconnected",
  auth_failed: "Auth failed",
};

const statusIcon = {
  active: CheckCircle2,
  disconnected: CircleOff,
  auth_failed: CircleAlert,
};

function ConnectionActionForm({
  action,
  children,
  connectionId,
}: {
  action(formData: FormData): void | Promise<void>;
  children: ReactNode;
  connectionId: string;
}) {
  return (
    <form action={action}>
      <input name="connectionId" type="hidden" value={connectionId} />
      {children}
    </form>
  );
}

export function ConnectionList({ connections }: ConnectionListProps) {
  if (connections.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-slate-300 bg-white p-8 text-center">
        <PlugZap aria-hidden="true" className="mx-auto size-8 text-indigo-600" />
        <h2 className="mt-3 text-lg text-slate-950">No workspaces connected</h2>
        <p className="mt-2 text-sm">
          Connect a helpdesk workspace before loading provider-backed tickets.
        </p>
        <Link
          className="mt-5 inline-flex h-9 items-center rounded-md border border-indigo-600 bg-indigo-600 px-3 text-sm text-white hover:bg-indigo-700"
          href="/workspace/connections/new"
        >
          Add workspace
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Link
          className="inline-flex h-9 items-center rounded-md border border-indigo-600 bg-indigo-600 px-3 text-sm text-white hover:bg-indigo-700"
          href="/workspace/connections/new"
        >
          Add workspace
        </Link>
      </div>
      {connections.map((connection) => {
        const StatusIcon = statusIcon[connection.status];

        return (
          <article
            className="rounded-md border border-slate-200 bg-white p-4"
            key={connection.id}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg text-slate-950">
                    {connection.displayName}
                  </h2>
                  {connection.active ? (
                    <span className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700">
                      Active workspace
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm">
                  {connection.providerLabel} · {connection.baseUrl}
                </p>
                <p className="mt-2 inline-flex items-center gap-1.5 text-sm">
                  <StatusIcon aria-hidden="true" className="size-4" />
                  {statusLabel[connection.status]}
                </p>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <ConnectionActionForm
                  action={setActiveHelpdeskConnectionAction}
                  connectionId={connection.id}
                >
                  <button
                    className="h-8 rounded-md border border-slate-200 bg-white px-2 text-sm hover:bg-slate-50 disabled:opacity-50"
                    disabled={connection.active || connection.status !== "active"}
                    type="submit"
                  >
                    Set active
                  </button>
                </ConnectionActionForm>
                <ConnectionActionForm
                  action={validateHelpdeskConnectionAction}
                  connectionId={connection.id}
                >
                  <button
                    className="h-8 rounded-md border border-slate-200 bg-white px-2 text-sm hover:bg-slate-50"
                    type="submit"
                  >
                    Validate
                  </button>
                </ConnectionActionForm>
                {connection.status === "active" ? (
                  <ConnectionActionForm
                    action={disableHelpdeskConnectionAction}
                    connectionId={connection.id}
                  >
                    <button
                      className="h-8 rounded-md border border-slate-200 bg-white px-2 text-sm hover:bg-slate-50"
                      type="submit"
                    >
                      Disable
                    </button>
                  </ConnectionActionForm>
                ) : null}
                <Link
                  className="inline-flex h-8 items-center rounded-md border border-slate-200 bg-white px-2 text-sm hover:bg-slate-50"
                  href={`/workspace/connections/${connection.id}/edit`}
                >
                  Edit
                </Link>
                <ConnectionActionForm
                  action={deleteHelpdeskConnectionAction}
                  connectionId={connection.id}
                >
                  <button
                    className="inline-flex h-8 items-center gap-1 rounded-md border border-rose-200 bg-white px-2 text-sm text-rose-700 hover:bg-rose-50"
                    type="submit"
                  >
                    <Trash2 aria-hidden="true" className="size-3.5" />
                    Delete
                  </button>
                </ConnectionActionForm>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
