"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Button, DropdownSelect, LoadingState } from "@/components/ui";
import { cn } from "@/components/ui/classnames";
import type {
  DeleteManagedUserAction,
  ManagedUser,
  ResetManagedUserPasswordAction,
  SaveManagedUserAction,
  UserManagementActionResult,
  UserManagementData,
} from "@/features/user-management";
import { WorkspaceSettingsUserForm } from "./workspace-settings-user-form";
import { WorkspaceSettingsUsersTable } from "./workspace-settings-users-table";

type Panel =
  | { mode: "create" }
  | { mode: "edit"; user: ManagedUser }
  | { mode: "reset"; user: ManagedUser }
  | { mode: "delete"; user: ManagedUser }
  | null;

const resultMessage: Record<UserManagementActionResult["code"], string> = {
  created: "User created.",
  deactivated: "User deactivated and scrubbed.",
  deleted: "User deleted.",
  "email-taken": "That email is already in use.",
  "invalid-input": "Check the user fields.",
  "not-admin": "Only admins can manage users.",
  "not-found": "User was not found.",
  "password-reset": "Password reset.",
  "replacement-owner-required": "Choose replacement owners before deleting.",
  "self-delete-blocked": "You cannot delete your own account.",
  updated: "User updated.",
};

function userLabel(user: ManagedUser) {
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;
}

export function WorkspaceSettingsUsersSection({
  deleteManagedUserAction,
  loadAction,
  resetManagedUserPasswordAction,
  saveManagedUserAction,
}: {
  deleteManagedUserAction?: DeleteManagedUserAction;
  loadAction?: () => Promise<UserManagementData>;
  resetManagedUserPasswordAction?: ResetManagedUserPasswordAction;
  saveManagedUserAction?: SaveManagedUserAction;
}) {
  const [data, setData] = useState<UserManagementData>();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [password, setPassword] = useState("");
  const [replacementOwners, setReplacementOwners] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (data || !loadAction) {
      return;
    }
    void loadAction().then(setData);
  }, [data, loadAction]);

  const activeUsers = useMemo(
    () => data?.users.filter((user) => user.status === "active") ?? [],
    [data],
  );

  function applyResult(result: UserManagementActionResult) {
    setMessage({ ok: result.ok, text: resultMessage[result.code] });
    if (result.ok && result.data) {
      setData(result.data);
      setPanel(null);
      setPassword("");
      setReplacementOwners({});
    }
  }

  function submitSave(request: Parameters<SaveManagedUserAction>[0]) {
    if (!saveManagedUserAction) {
      return;
    }
    startTransition(() => {
      void saveManagedUserAction(request).then(applyResult);
    });
  }

  function submitReset() {
    if (!resetManagedUserPasswordAction || panel?.mode !== "reset") {
      return;
    }
    startTransition(() => {
      void resetManagedUserPasswordAction({
        password,
        userId: panel.user.id,
      }).then(applyResult);
    });
  }

  function submitDelete() {
    if (!deleteManagedUserAction || panel?.mode !== "delete") {
      return;
    }
    startTransition(() => {
      void deleteManagedUserAction({
        replacementOwners,
        userId: panel.user.id,
      }).then(applyResult);
    });
  }

  const deleteUser = panel?.mode === "delete" ? panel.user : null;
  const ownedWorkspaces = deleteUser
    ? data?.workspaces.filter((workspace) =>
        deleteUser.ownedWorkspaceIds.includes(workspace.id),
      ) ?? []
    : [];

  return (
    <section className="relative flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-950">Users</h3>
          <p className="text-sm text-slate-600">
            Manage global users, workspace access, and workspace AI permissions.
          </p>
        </div>
        <Button
          disabled={!data || isPending}
          onClick={() => setPanel({ mode: "create" })}
          type="button"
          variant="primary"
        >
          Add user
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden px-5 py-4">
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
        {!data ? (
          <LoadingState label="Loading users" />
        ) : (
          <WorkspaceSettingsUsersTable
            currentUserId={data.currentUserId}
            onDelete={(user) => setPanel({ mode: "delete", user })}
            onEdit={(user) => setPanel({ mode: "edit", user })}
            onResetPassword={(user) => setPanel({ mode: "reset", user })}
            pending={isPending}
            users={data.users}
          />
        )}
      </div>
      {panel?.mode === "create" || panel?.mode === "edit" ? (
        <div className="absolute inset-y-0 right-0 z-10 w-[34rem] border-l border-slate-200 shadow-xl">
          <WorkspaceSettingsUserForm
            onCancel={() => setPanel(null)}
            onSubmit={submitSave}
            pending={isPending}
            user={panel.mode === "edit" ? panel.user : undefined}
            workspaces={data?.workspaces ?? []}
          />
        </div>
      ) : null}
      {panel?.mode === "reset" ? (
        <div className="absolute inset-y-0 right-0 z-10 flex w-96 flex-col border-l border-slate-200 bg-white p-4 shadow-xl">
          <h4 className="text-base font-semibold text-slate-950">
            Reset password
          </h4>
          <p className="mt-1 text-sm text-slate-600">
            Set a new temporary password for {userLabel(panel.user)}.
          </p>
          <label className="mt-4 block">
            <span className="mb-1 block text-sm font-medium text-slate-800">
              Temporary password
            </span>
            <input
              className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
              minLength={12}
              onChange={(event) => setPassword(event.currentTarget.value)}
              type="password"
              value={password}
            />
          </label>
          <div className="mt-auto flex justify-end gap-2">
            <Button onClick={() => setPanel(null)} type="button">
              Cancel
            </Button>
            <Button onClick={submitReset} type="button" variant="primary">
              Reset password
            </Button>
          </div>
        </div>
      ) : null}
      {deleteUser ? (
        <div className="absolute inset-y-0 right-0 z-10 flex w-[28rem] flex-col border-l border-slate-200 bg-white p-4 shadow-xl">
          <h4 className="text-base font-semibold text-slate-950">
            Delete user
          </h4>
          <p className="mt-1 text-sm text-slate-600">
            {deleteUser.hasProviderMutations
              ? "This user has provider write history, so they will be deactivated and scrubbed instead of hard-deleted."
              : "This user has no provider write history and can be hard-deleted."}
          </p>
          {ownedWorkspaces.length > 0 ? (
            <div className="mt-4 space-y-3">
              <h5 className="text-sm font-semibold text-slate-950">
                Replacement owners
              </h5>
              {ownedWorkspaces.map((workspace) => (
                <DropdownSelect
                  key={workspace.id}
                  label={workspace.label}
                  onValueChange={(value) =>
                    setReplacementOwners((current) => ({
                      ...current,
                      [workspace.id]: value,
                    }))
                  }
                  options={activeUsers
                    .filter((user) => user.id !== deleteUser.id)
                    .map((user) => ({ value: user.id, label: userLabel(user) }))}
                  triggerClassName="w-full"
                  value={replacementOwners[workspace.id]}
                />
              ))}
            </div>
          ) : null}
          <div className="mt-auto flex justify-end gap-2">
            <Button onClick={() => setPanel(null)} type="button">
              Cancel
            </Button>
            <Button onClick={submitDelete} type="button" variant="primary">
              {deleteUser.hasProviderMutations ? "Deactivate user" : "Delete user"}
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
