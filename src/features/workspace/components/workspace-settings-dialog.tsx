"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type {
  AiPromptCenterData,
  WorkspaceAiSettingsData,
} from "@/features/ai";
import type { SavedViewSettingsData } from "@/features/saved-views/settings-model";
import { WorkspacesSection } from "./workspace-settings-workspaces-section";
import { AiSettingsSection } from "./workspace-ai-settings-section";
import { AiPromptsSection } from "./workspace-ai-prompts-section";
import { WorkspaceSettingsNav } from "./workspace-settings-nav";
import { WorkspaceSettingsMyStyleSection } from "./workspace-settings-my-style-section";
import { WorkspaceSettingsProfileSection } from "./workspace-settings-profile-section";
import type { WorkspaceSettingsDialogProps } from "./workspace-settings-dialog-types";
import type { WorkspaceSettingsSection } from "./workspace-settings-types";
import { ViewsSection } from "./workspace-settings-views-section";

export type { WorkspaceSettingsSection } from "./workspace-settings-types";

function initialVisibleSection(
  section: WorkspaceSettingsSection,
  aiSettingsData: WorkspaceAiSettingsData | undefined,
) {
  if (
    section === "my-style" &&
    (!aiSettingsData || aiSettingsData.policy === "disabled")
  ) {
    return "ai";
  }
  return section;
}

export function WorkspaceSettingsDialog({
  changePasswordAction,
  connections: initialConnections,
  createConnectionAction,
  deleteConnectionAction,
  deleteSavedViewAction,
  deleteWorkspaceAiRephraseStyleAction,
  disableConnectionAction,
  initialAiSettingsData,
  initialSection,
  initialSavedViewData,
  loadAiPromptCenterAction,
  loadMyStyleAction,
  loadWorkspaceAiSettingsAction,
  moveWorkspaceAiRephraseStyleAction,
  loadSavedViewsSettingsAction,
  onClose,
  onAiSettingsDataChange,
  onProfileUserChange,
  onRephraseStylesChange,
  onSavedViewDataChange,
  providerOptions,
  resetUserAiRephraseStyleOverrideAction,
  resetMyStyleAction,
  resetWorkspaceAiPromptAction,
  reorderSavedViewsAction,
  saveMyStyleAction,
  saveUserAiRephraseStyleOverrideAction,
  saveWorkspaceAiRephraseStyleAction,
  saveWorkspaceAiPromptAction,
  saveUserWorkspaceAiSettingsAction,
  saveWorkspaceAiSettingsAction,
  saveSavedViewAction,
  setActiveConnectionAction,
  setDefaultSavedViewAction,
  updateAvatarAction,
  updateProfileAction,
  updateConnectionAction,
  userAvatarDataUrl,
  userDisplayName,
  userEmail,
  userFirstName,
  userLastName,
  userRole,
  validateConnectionAction,
}: WorkspaceSettingsDialogProps) {
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const [section, setSection] = useState<WorkspaceSettingsSection>(() =>
    initialVisibleSection(initialSection, initialAiSettingsData),
  );
  const [connections, setConnections] = useState(initialConnections);
  const [aiSettingsData, setAiSettingsData] = useState(initialAiSettingsData);
  const [promptCenterData, setPromptCenterData] = useState<AiPromptCenterData>();
  const [savedViewData, setSavedViewData] = useState(initialSavedViewData);
  const myStyleAvailable = Boolean(
    aiSettingsData && aiSettingsData.policy !== "disabled",
  );
  useEffect(() => {
    restoreFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const timeoutId = window.setTimeout(() => closeButtonRef.current?.focus(), 0);
    return () => {
      window.clearTimeout(timeoutId);
      restoreFocusRef.current?.focus();
    };
  }, []);

  useEffect(() => {
    if (section !== "views" || savedViewData || !loadSavedViewsSettingsAction) {
      return;
    }
    void loadSavedViewsSettingsAction().then((data) => {
      setSavedViewData(data);
      onSavedViewDataChange?.(data);
    });
  }, [loadSavedViewsSettingsAction, onSavedViewDataChange, savedViewData, section]);

  useEffect(() => {
    if (section !== "prompts" || promptCenterData || !loadAiPromptCenterAction) {
      return;
    }
    void loadAiPromptCenterAction().then(setPromptCenterData);
  }, [loadAiPromptCenterAction, promptCenterData, section]);

  function applySavedViewData(data: SavedViewSettingsData) {
    setSavedViewData(data);
    onSavedViewDataChange?.(data);
  }

  function applyAiSettingsData(data: WorkspaceAiSettingsData) {
    setAiSettingsData(data);
    setPromptCenterData(undefined);
    if (!data.canViewPromptCenter && section === "prompts") {
      setSection("ai");
    }
    if (data.policy === "disabled" && section === "my-style") {
      setSection("ai");
    }
    onAiSettingsDataChange?.(data);
  }

  function reloadAiSettingsAfterWorkspaceChange() {
    setAiSettingsData(undefined);
    setPromptCenterData(undefined);
    if (!loadWorkspaceAiSettingsAction) {
      return;
    }
    void loadWorkspaceAiSettingsAction().then(applyAiSettingsData);
  }

  function applyPromptCenterData(data: AiPromptCenterData) {
    setPromptCenterData(data);
    onRephraseStylesChange?.(
      data.workspaceRephraseStyles
        .filter((style) => style.isEnabled)
        .map((style) => ({ id: style.id, label: style.label })),
    );
  }

  const activeWorkspaceLabel =
    connections.find((connection) => connection.active)?.label ?? "No active workspace";

  if (typeof document === "undefined") {
    return null;
  }
  const dialog = (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <div
        aria-labelledby={titleId}
        aria-modal="true"
        className="flex h-[90vh] w-[90vw] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl"
        role="dialog"
      >
        <h2 className="sr-only" id={titleId}>
          Settings
        </h2>
        <WorkspaceSettingsNav
          activeSection={section}
          myStyleAvailable={myStyleAvailable}
          onSectionChange={setSection}
          promptCenterAvailable={Boolean(aiSettingsData?.canViewPromptCenter)}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-10 shrink-0 items-center justify-end border-b border-slate-200">
            <button
              aria-label="Close settings"
              className="grid size-10 place-items-center text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-indigo-600"
              onClick={onClose}
              ref={closeButtonRef}
              type="button"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>
          {section === "profile" ? (
            <WorkspaceSettingsProfileSection
              changePasswordAction={changePasswordAction}
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
          ) : section === "my-style" && myStyleAvailable ? (
            <WorkspaceSettingsMyStyleSection
              loadMyStyleAction={loadMyStyleAction}
              resetMyStyleAction={resetMyStyleAction}
              saveMyStyleAction={saveMyStyleAction}
            />
          ) : section === "workspaces" ? (
            <WorkspacesSection
              connections={connections}
              createConnectionAction={createConnectionAction}
              deleteConnectionAction={deleteConnectionAction}
              disableConnectionAction={disableConnectionAction}
              onActiveWorkspaceChange={reloadAiSettingsAfterWorkspaceChange}
              onConnectionsChange={setConnections}
              providerOptions={providerOptions}
              setActiveConnectionAction={setActiveConnectionAction}
              updateConnectionAction={updateConnectionAction}
              validateConnectionAction={validateConnectionAction}
            />
          ) : section === "views" ? (
            <ViewsSection
              key={savedViewData ? "views-ready" : "views-loading"}
              data={savedViewData}
              deleteSavedViewAction={deleteSavedViewAction}
              onDataChange={applySavedViewData}
              activeWorkspaceLabel={activeWorkspaceLabel}
              reorderSavedViewsAction={reorderSavedViewsAction}
              saveSavedViewAction={saveSavedViewAction}
              setDefaultSavedViewAction={setDefaultSavedViewAction}
              userRole={userRole}
            />
          ) : section === "prompts" ? (
            <AiPromptsSection
              data={promptCenterData}
              deleteWorkspaceAiRephraseStyleAction={
                deleteWorkspaceAiRephraseStyleAction
              }
              loadAction={loadAiPromptCenterAction}
              moveWorkspaceAiRephraseStyleAction={
                moveWorkspaceAiRephraseStyleAction
              }
              onDataChange={applyPromptCenterData}
              resetUserAiRephraseStyleOverrideAction={
                resetUserAiRephraseStyleOverrideAction
              }
              resetWorkspaceAiPromptAction={resetWorkspaceAiPromptAction}
              saveUserAiRephraseStyleOverrideAction={
                saveUserAiRephraseStyleOverrideAction
              }
              saveWorkspaceAiRephraseStyleAction={
                saveWorkspaceAiRephraseStyleAction
              }
              saveWorkspaceAiPromptAction={saveWorkspaceAiPromptAction}
            />
          ) : (
            <AiSettingsSection
              data={aiSettingsData}
              onDataChange={applyAiSettingsData}
              saveUserWorkspaceAiSettingsAction={saveUserWorkspaceAiSettingsAction}
              saveWorkspaceAiSettingsAction={saveWorkspaceAiSettingsAction}
              userRole={userRole}
            />
          )}
        </div>
      </div>
    </div>
  );
  return createPortal(dialog, document.body);
}
