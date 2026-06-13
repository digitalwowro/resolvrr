"use client";

import { KeyRound } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import type { ChangePasswordResult } from "@/auth/service";
import { Button } from "@/components/ui";
import { cn } from "@/components/ui/classnames";

export type ChangePasswordAction = (
  formData: FormData,
) => Promise<ChangePasswordResult>;

type WorkspaceSettingsProfilePasswordFormProps = {
  changePasswordAction?: ChangePasswordAction;
};

const inputClass =
  "mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50";

const passwordMessageText: Record<ChangePasswordResult["code"], string> = {
  "invalid-current-password": "Current password is not correct.",
  "invalid-password-input":
    "Enter a new password with at least 12 characters and matching confirmation.",
  "not-authenticated": "Sign in again before changing your password.",
  "password-changed": "Password changed. Other sessions were signed out.",
};

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

export function WorkspaceSettingsProfilePasswordForm({
  changePasswordAction,
}: WorkspaceSettingsProfilePasswordFormProps) {
  const [passwordMessage, setPasswordMessage] =
    useState<{ ok: boolean; text: string } | null>(null);
  const [passwordPending, setPasswordPending] = useState(false);

  function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!changePasswordAction) {
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    setPasswordPending(true);
    void changePasswordAction(formData)
      .then((result) => {
        setPasswordMessage({
          ok: result.ok,
          text: passwordMessageText[result.code],
        });
        if (result.ok) {
          form.reset();
        }
      })
      .finally(() => setPasswordPending(false));
  }

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <KeyRound aria-hidden="true" className="size-5 text-slate-500" />
        <h4 className="text-base font-semibold text-slate-950">Password</h4>
      </div>
      <form className="mt-4 space-y-3" onSubmit={submitPassword}>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="block text-sm font-medium text-slate-700">
            Current password
            <input
              autoComplete="current-password"
              className={inputClass}
              disabled={passwordPending || !changePasswordAction}
              name="currentPassword"
              required
              type="password"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            New password
            <input
              autoComplete="new-password"
              className={inputClass}
              disabled={passwordPending || !changePasswordAction}
              minLength={12}
              name="newPassword"
              required
              type="password"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Confirm new password
            <input
              autoComplete="new-password"
              className={inputClass}
              disabled={passwordPending || !changePasswordAction}
              minLength={12}
              name="confirmPassword"
              required
              type="password"
            />
          </label>
        </div>
        <Message message={passwordMessage} />
        <Button
          disabled={!changePasswordAction}
          loading={passwordPending}
          type="submit"
          variant="primary"
        >
          Change password
        </Button>
      </form>
    </section>
  );
}
