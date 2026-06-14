"use client";

import type { AuthUser, AuthUserRole } from "@/auth/types";
import {
  WorkspaceSettingsProfileAccountCard,
  type UpdateAvatarAction,
  type UpdateProfileAction,
} from "./workspace-settings-profile-account-card";
import {
  WorkspaceSettingsProfilePasswordForm,
  type ChangePasswordAction,
} from "./workspace-settings-profile-password-form";

export type { ChangePasswordAction } from "./workspace-settings-profile-password-form";
export type {
  UpdateAvatarAction,
  UpdateProfileAction,
} from "./workspace-settings-profile-account-card";

type WorkspaceSettingsProfileSectionProps = {
  changePasswordAction?: ChangePasswordAction;
  onProfileUserChange?(user: AuthUser): void;
  updateAvatarAction?: UpdateAvatarAction;
  updateProfileAction?: UpdateProfileAction;
  userAvatarDataUrl: string | null;
  userDisplayName: string | null;
  userEmail: string;
  userFirstName: string | null;
  userLastName: string | null;
  userRole: AuthUserRole;
};

export function WorkspaceSettingsProfileSection({
  changePasswordAction,
  onProfileUserChange,
  updateAvatarAction,
  updateProfileAction,
  userAvatarDataUrl,
  userDisplayName,
  userEmail,
  userFirstName,
  userLastName,
  userRole,
}: WorkspaceSettingsProfileSectionProps) {
  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-slate-200 px-5 py-4">
        <h3 className="text-lg font-semibold text-slate-950">My Profile</h3>
        <p className="text-sm text-slate-600">
          Manage your global account details and password.
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <div className="space-y-4">
          <WorkspaceSettingsProfileAccountCard
            onProfileUserChange={onProfileUserChange}
            updateAvatarAction={updateAvatarAction}
            updateProfileAction={updateProfileAction}
            userAvatarDataUrl={userAvatarDataUrl}
            userDisplayName={userDisplayName}
            userEmail={userEmail}
            userFirstName={userFirstName}
            userLastName={userLastName}
            userRole={userRole}
          />
          <WorkspaceSettingsProfilePasswordForm
            changePasswordAction={changePasswordAction}
          />
        </div>
      </div>
    </section>
  );
}
