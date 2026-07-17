"use client";

import { createContext, useContext, type ReactNode } from "react";
import type {
  DeleteWorkspaceSignatureTemplateAction,
  LoadTicketSignaturePreviewAction,
  LoadWorkspaceSignatureSettingsAction,
  SaveWorkspaceSignatureSourceAction,
  SaveWorkspaceSignatureTemplateAction,
} from "@/features/signatures";

export type WorkspaceSignatureActions = {
  deleteWorkspaceSignatureTemplateAction: DeleteWorkspaceSignatureTemplateAction;
  loadTicketSignaturePreviewAction: LoadTicketSignaturePreviewAction;
  loadWorkspaceSignatureSettingsAction: LoadWorkspaceSignatureSettingsAction;
  saveWorkspaceSignatureSourceAction: SaveWorkspaceSignatureSourceAction;
  saveWorkspaceSignatureTemplateAction: SaveWorkspaceSignatureTemplateAction;
};

const defaultSettings = {
  canManage: false, groupOptions: [], source: "none" as const,
  templates: [], workspaceLabel: "Workspace",
};
const unavailableResult = { data: defaultSettings, message: "Signature settings are unavailable.", ok: false };
const defaultActions: WorkspaceSignatureActions = {
  deleteWorkspaceSignatureTemplateAction: async () => unavailableResult,
  loadTicketSignaturePreviewAction: async () => ({
  signature: { contextVersion: "signature-disabled", source: "none" },
  status: "available",
  }),
  loadWorkspaceSignatureSettingsAction: async () => defaultSettings,
  saveWorkspaceSignatureSourceAction: async () => unavailableResult,
  saveWorkspaceSignatureTemplateAction: async () => unavailableResult,
};

const WorkspaceSignatureActionsContext = createContext(defaultActions);

export function WorkspaceSignatureActionsProvider({
  actions,
  children,
}: {
  actions: WorkspaceSignatureActions;
  children: ReactNode;
}) {
  return (
    <WorkspaceSignatureActionsContext.Provider value={actions}>
      {children}
    </WorkspaceSignatureActionsContext.Provider>
  );
}

export function useWorkspaceSignatureActions() {
  return useContext(WorkspaceSignatureActionsContext);
}
