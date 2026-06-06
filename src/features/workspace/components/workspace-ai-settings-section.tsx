"use client";

import { useState } from "react";
import { cn } from "@/components/ui/classnames";
import type { AuthUserRole } from "@/auth/types";
import type {
  SaveUserWorkspaceAiSettingsAction,
  SaveWorkspaceAiSettingsAction,
  WorkspaceAiSettingsActionCode,
  WorkspaceAiSettingsActionResult,
  WorkspaceAiSettingsData,
} from "@/features/ai";
import { WorkspaceAiSettingsAdminForm } from "./workspace-ai-settings-admin-form";
import { WorkspaceAiSettingsUserForm } from "./workspace-ai-settings-user-form";

const defaultData: WorkspaceAiSettingsData = {
  activeWorkspace: null,
  canManageWorkspace: false,
  policy: "disabled",
  userConfig: null,
  workspaceConfig: null,
  workspaceConfigConfigured: false,
};

const messageText: Record<WorkspaceAiSettingsActionCode, string> = {
  "ai-settings-saved": "AI settings saved.",
  "ai-user-settings-saved": "AI key saved.",
  "invalid-ai-base-url": "Enter a valid HTTPS AI provider URL.",
  "invalid-ai-config": "Saved AI settings need attention.",
  "invalid-ai-input": "Check the AI settings fields.",
  "missing-ai-config": "Enter provider, base URL, model, and API key.",
  "no-active-workspace": "Select an active workspace first.",
  "not-admin": "Only admins can change workspace AI settings.",
  "provider-auth-failed": "The AI provider rejected the credentials.",
  "provider-rate-limited": "The AI provider is rate limited.",
  "provider-temporary-failure": "AI provider validation temporarily failed.",
  "user-ai-not-required": "This workspace does not require a personal AI key.",
};

function userStatus(data: WorkspaceAiSettingsData) {
  if (!data.activeWorkspace) {
    return "Select an active workspace first.";
  }
  if (data.policy === "disabled") {
    return "AI is disabled for this workspace.";
  }
  if (data.policy === "admin-managed") {
    return data.workspaceConfigConfigured
      ? "AI is enabled by the workspace admin."
      : "AI is not configured for this workspace.";
  }
  return "Add your AI provider settings for this workspace.";
}

export function AiSettingsSection({
  data: initialData,
  onDataChange,
  saveUserWorkspaceAiSettingsAction,
  saveWorkspaceAiSettingsAction,
  userRole,
}: {
  data?: WorkspaceAiSettingsData;
  onDataChange(data: WorkspaceAiSettingsData): void;
  saveUserWorkspaceAiSettingsAction?: SaveUserWorkspaceAiSettingsAction;
  saveWorkspaceAiSettingsAction?: SaveWorkspaceAiSettingsAction;
  userRole: AuthUserRole;
}) {
  const [message, setMessage] =
    useState<{ ok: boolean; text: string; workspaceId: string | null } | null>(
      null,
    );
  const data = initialData ?? defaultData;
  const isAdmin = userRole === "ADMIN";
  const activeWorkspaceId = data.activeWorkspace?.id ?? null;
  const visibleMessage =
    message?.workspaceId === activeWorkspaceId ? message : null;

  function applyResult(result: WorkspaceAiSettingsActionResult) {
    onDataChange(result.data);
    setMessage({
      ok: result.ok,
      text: messageText[result.code],
      workspaceId: result.data.activeWorkspace?.id ?? null,
    });
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-slate-200 px-5 py-4">
        <h3 className="text-lg font-semibold text-slate-950">AI Settings</h3>
        <p className="text-sm text-slate-600">
          {data.activeWorkspace?.label ?? "No active workspace"}
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {visibleMessage ? (
          <div
            className={cn(
              "mb-4 rounded-md border px-3 py-2 text-sm",
              visibleMessage.ok
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-rose-200 bg-rose-50 text-rose-800",
            )}
            role="status"
          >
            {visibleMessage.text}
          </div>
        ) : null}
        {isAdmin ? (
          <div className="space-y-4">
            <WorkspaceAiSettingsAdminForm
              action={saveWorkspaceAiSettingsAction}
              data={data}
              onResult={applyResult}
            />
            {data.policy === "user-provided" ? (
              <section>
                <h4 className="mb-2 text-sm font-medium text-slate-700">
                  Personal workspace key
                </h4>
                <WorkspaceAiSettingsUserForm
                  action={saveUserWorkspaceAiSettingsAction}
                  data={data}
                  onResult={applyResult}
                />
              </section>
            ) : null}
          </div>
        ) : data.policy === "user-provided" ? (
          <WorkspaceAiSettingsUserForm
            action={saveUserWorkspaceAiSettingsAction}
            data={data}
            onResult={applyResult}
          />
        ) : (
          <div className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
            {userStatus(data)}
          </div>
        )}
      </div>
    </section>
  );
}
