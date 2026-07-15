"use client";

import { useMemo, useState } from "react";
import { Button, Checkbox, DropdownSelect } from "@/components/ui";
import type {
  ManagedUser,
  ManagedUserMembership,
  ManagedUserRole,
  ManagedWorkspaceOption,
  SaveManagedUserRequest,
} from "@/features/user-management";

const roleOptions = [
  { value: "USER", label: "User" },
  { value: "ADMIN", label: "Admin" },
];
const workspaceRoleOptions = [
  { value: "AGENT", label: "Agent" },
  { value: "ADMIN", label: "Workspace admin" },
];

function membershipKey(membership: ManagedUserMembership) {
  return membership.workspaceId;
}

function userNamePart(value: string | null) {
  return value ?? "";
}

export function WorkspaceSettingsUserForm({
  onCancel,
  onSubmit,
  pending,
  user,
  workspaces,
}: {
  onCancel(): void;
  onSubmit(request: SaveManagedUserRequest): void;
  pending: boolean;
  user?: ManagedUser;
  workspaces: ManagedWorkspaceOption[];
}) {
  const [email, setEmail] = useState(user?.email ?? "");
  const [firstName, setFirstName] = useState(userNamePart(user?.firstName ?? null));
  const [lastName, setLastName] = useState(userNamePart(user?.lastName ?? null));
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<ManagedUserRole>(user?.role ?? "USER");
  const [memberships, setMemberships] = useState<ManagedUserMembership[]>(
    user?.memberships ?? [],
  );
  const membershipMap = useMemo(
    () => new Map(memberships.map((membership) => [membershipKey(membership), membership])),
    [memberships],
  );

  function updateMembership(
    workspaceId: string,
    update: (membership: ManagedUserMembership) => ManagedUserMembership,
  ) {
    setMemberships((current) =>
      current.map((membership) =>
        membership.workspaceId === workspaceId
          ? update(membership)
          : membership,
      ),
    );
  }

  function toggleWorkspace(workspaceId: string, checked: boolean) {
    setMemberships((current) => {
      if (!checked) {
        return current.filter(
          (membership) => membership.workspaceId !== workspaceId,
        );
      }
      if (current.some((membership) => membership.workspaceId === workspaceId)) {
        return current;
      }
      return [
        ...current,
        {
          canEditAiRephraseStyleOverrides: false,
          canEditMyStyle: false,
          workspaceId: workspaceId,
          role: "AGENT",
        },
      ];
    });
  }

  function submit() {
    onSubmit({
      email,
      firstName: firstName.trim() || null,
      lastName: lastName.trim() || null,
      memberships,
      password: user ? undefined : password,
      role,
      userId: user?.id,
    });
  }

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <h4 className="text-base font-semibold text-slate-950">
          {user ? "Edit user" : "Create user"}
        </h4>
        <p className="text-sm text-slate-600">
          Manage global account details and workspace access.
        </p>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-800">
            Email
          </span>
          <input
            className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-900"
            disabled={Boolean(user)}
            onChange={(event) => setEmail(event.currentTarget.value)}
            required
            type="email"
            value={email}
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-800">
              First name
            </span>
            <input
              className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-900"
              onChange={(event) => setFirstName(event.currentTarget.value)}
              value={firstName}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-800">
              Last name
            </span>
            <input
              className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-900"
              onChange={(event) => setLastName(event.currentTarget.value)}
              value={lastName}
            />
          </label>
        </div>
        {!user ? (
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-800">
              Temporary password
            </span>
            <input
              className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-900"
              minLength={12}
              onChange={(event) => setPassword(event.currentTarget.value)}
              required
              type="password"
              value={password}
            />
          </label>
        ) : null}
        <DropdownSelect
          className="block w-full"
          label="Global role"
          menuClassName="w-full"
          onValueChange={(value) => setRole(value as ManagedUserRole)}
          options={roleOptions}
          triggerClassName="w-full"
          value={role}
        />
        <div>
          <h5 className="text-sm font-semibold text-slate-950">
            Workspace access
          </h5>
          <div className="mt-2 space-y-3">
            {workspaces.map((workspace) => {
              const membership = membershipMap.get(workspace.id);
              return (
                <div
                  className="rounded-md border border-slate-200 p-3"
                  key={workspace.id}
                >
                  <Checkbox
                    checked={Boolean(membership)}
                    label={workspace.label}
                    onChange={(event) =>
                      toggleWorkspace(workspace.id, event.currentTarget.checked)
                    }
                  />
                  {membership ? (
                    <div className="mt-3 grid grid-cols-2 gap-3 pl-7">
                      <DropdownSelect
                        label="Workspace role"
                        onValueChange={(value) =>
                          updateMembership(workspace.id, (current) => ({
                            ...current,
                            role: value as ManagedUserMembership["role"],
                          }))
                        }
                        options={workspaceRoleOptions}
                        triggerClassName="w-full"
                        value={membership.role}
                      />
                      <div className="space-y-2 pt-6 text-sm">
                        <p className="text-xs text-slate-500">
                          Helpdesk: {membership.connectionStatus ?? "not-connected"}
                        </p>
                        <Checkbox
                          checked={membership.canEditMyStyle}
                          label="Can manage My Style"
                          onChange={(event) =>
                            updateMembership(workspace.id, (current) => ({
                              ...current,
                              canEditMyStyle: event.currentTarget.checked,
                            }))
                          }
                        />
                        <Checkbox
                          checked={membership.canEditAiRephraseStyleOverrides}
                          label="Can customize prompts"
                          onChange={(event) =>
                            updateMembership(workspace.id, (current) => ({
                              ...current,
                              canEditAiRephraseStyleOverrides:
                                event.currentTarget.checked,
                            }))
                          }
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2 border-t border-slate-200 px-4 py-3">
        <Button disabled={pending} onClick={onCancel} type="button">
          Cancel
        </Button>
        <Button disabled={pending} onClick={submit} type="button" variant="primary">
          {user ? "Save user" : "Create user"}
        </Button>
      </div>
    </div>
  );
}
