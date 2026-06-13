"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useState } from "react";
import type { AuthUser, AuthUserRole } from "@/auth/types";
import type {
  UpdateAvatarResult,
  UpdateProfileResult,
} from "@/auth/service";
import { Button } from "@/components/ui";
import { cn } from "@/components/ui/classnames";
import { WorkspaceSettingsProfileNameField } from "./workspace-settings-profile-name-field";
import {
  WorkspaceSettingsProfilePasswordForm,
  type ChangePasswordAction,
} from "./workspace-settings-profile-password-form";

export type { ChangePasswordAction } from "./workspace-settings-profile-password-form";

export type UpdateProfileAction = (
  formData: FormData,
) => Promise<UpdateProfileResult>;

export type UpdateAvatarAction = (
  formData: FormData,
) => Promise<UpdateAvatarResult>;

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

const profileMessageText: Record<UpdateProfileResult["code"], string> = {
  "invalid-profile": "Enter names under 80 characters.",
  "not-authenticated": "Sign in again before updating your profile.",
  "profile-updated": "Profile updated.",
};

const avatarMessageText: Record<UpdateAvatarResult["code"], string> = {
  "avatar-updated": "Avatar updated.",
  "invalid-avatar": "Upload a PNG, JPEG, or WebP image under 512 KB.",
  "not-authenticated": "Sign in again before updating your avatar.",
};

function fullName(firstName: string | null, lastName: string | null) {
  return [firstName, lastName]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(" ");
}

function initials({
  displayName,
  email,
  firstName,
  lastName,
}: {
  displayName: string | null;
  email: string;
  firstName: string | null;
  lastName: string | null;
}) {
  const firstInitial = firstName?.trim().slice(0, 1) ?? "";
  const lastInitial = lastName?.trim().slice(0, 1) ?? "";
  const nameInitials = `${firstInitial}${lastInitial}`;

  if (nameInitials) {
    return nameInitials.toUpperCase();
  }

  const source = displayName?.trim() || email;
  return source.slice(0, 2).toUpperCase();
}

function Message({
  message,
}: { message: { ok: boolean; text: string } | null }) {
  if (!message) {
    return null;
  }

  return (
    <p
      className={cn(
        "rounded-md border px-3 py-2 text-sm",
        message.ok
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-rose-200 bg-rose-50 text-rose-800",
      )}
      role="status"
    >
      {message.text}
    </p>
  );
}

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
  const [avatarDataUrl, setAvatarDataUrl] = useState(userAvatarDataUrl);
  const [firstName, setFirstName] = useState(userFirstName ?? "");
  const [lastName, setLastName] = useState(userLastName ?? "");
  const [profileMessage, setProfileMessage] =
    useState<{ ok: boolean; text: string } | null>(null);
  const [avatarMessage, setAvatarMessage] =
    useState<{ ok: boolean; text: string } | null>(null);
  const [profilePending, setProfilePending] = useState(false);
  const [avatarPending, setAvatarPending] = useState(false);

  function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!updateProfileAction) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    setProfilePending(true);
    void updateProfileAction(formData)
      .then((result) => {
        setProfileMessage({
          ok: result.ok,
          text: profileMessageText[result.code],
        });
        if (result.ok) {
          setFirstName(result.user.firstName ?? "");
          setLastName(result.user.lastName ?? "");
          setAvatarDataUrl(result.user.avatarDataUrl);
          onProfileUserChange?.(result.user);
        }
      })
      .finally(() => setProfilePending(false));
  }

  function changeAvatar(event: ChangeEvent<HTMLInputElement>) {
    if (!updateAvatarAction) {
      return;
    }

    const input = event.currentTarget;
    const avatar = input.files?.[0];
    if (!avatar) {
      return;
    }

    const formData = new FormData();
    formData.set("avatar", avatar);
    setAvatarPending(true);
    void updateAvatarAction(formData)
      .then((result) => {
        setAvatarMessage({
          ok: result.ok,
          text: avatarMessageText[result.code],
        });
        if (result.ok) {
          setAvatarDataUrl(result.user.avatarDataUrl);
          onProfileUserChange?.(result.user);
        }
      })
      .finally(() => {
        input.value = "";
        setAvatarPending(false);
      });
  }

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
          <section className="rounded-md border border-slate-200 bg-white p-4">
            <div className="flex items-stretch gap-3">
              <label
                className={cn(
                  "group relative grid size-[66px] shrink-0 cursor-pointer place-items-center overflow-hidden rounded-full bg-indigo-600 text-sm font-semibold text-white",
                  "focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-indigo-600",
                  (!updateAvatarAction || avatarPending) &&
                    "cursor-not-allowed opacity-70",
                )}
              >
                <input
                  accept="image/png,image/jpeg,image/webp"
                  aria-label="Upload avatar"
                  className="sr-only"
                  disabled={avatarPending || !updateAvatarAction}
                  onChange={changeAvatar}
                  type="file"
                />
                {avatarDataUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element -- User avatar is stored as a validated data URL. */
                  <img
                    alt=""
                    className="size-full rounded-full object-cover"
                    src={avatarDataUrl}
                  />
                ) : (
                  initials({
                    displayName: userDisplayName,
                    email: userEmail,
                    firstName,
                    lastName,
                  })
                )}
                <span className="absolute inset-0 grid place-items-center bg-slate-950/70 px-1 text-center text-[10px] font-medium leading-tight text-white opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                  {avatarPending ? "Uploading" : "Upload avatar"}
                </span>
              </label>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-base font-semibold text-slate-950">
                    Account
                  </h4>
                  <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700">
                    {userRole === "ADMIN" ? "Admin" : "User"}
                  </span>
                </div>
                <p className="mt-1 truncate text-sm text-slate-600">
                  {fullName(firstName, lastName) || userDisplayName || userEmail}
                </p>
                <p className="mt-0.5 truncate text-xs text-slate-500">
                  {userEmail}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <Message message={avatarMessage} />
            </div>

            <div className="mt-4">
              <form className="space-y-3" onSubmit={submitProfile}>
                <div className="grid gap-3 md:grid-cols-2">
                  <WorkspaceSettingsProfileNameField
                    disabled={profilePending || !updateProfileAction}
                    label="First name"
                    name="firstName"
                    onChange={setFirstName}
                    placeholder="Add a first name"
                    tooltip="Given name"
                    value={firstName}
                  />
                  <WorkspaceSettingsProfileNameField
                    disabled={profilePending || !updateProfileAction}
                    label="Last name"
                    name="lastName"
                    onChange={setLastName}
                    placeholder="Add a last name"
                    tooltip="Family name"
                    value={lastName}
                  />
                </div>
                <Message message={profileMessage} />
                <Button
                  disabled={!updateProfileAction}
                  loading={profilePending}
                  type="submit"
                  variant="primary"
                >
                  Save profile
                </Button>
              </form>
            </div>
          </section>

          <WorkspaceSettingsProfilePasswordForm
            changePasswordAction={changePasswordAction}
          />
        </div>
      </div>
    </section>
  );
}
