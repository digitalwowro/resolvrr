"use client";
import { allTicketsSavedViewId, type WorkspaceSavedView } from "@/features/saved-views/workspace";
import { noTicketCommunicationCapabilities } from "@/features/tickets/communication-model";
import type { HelpdeskConnectionFormAction } from "@/features/helpdesk-connections/service-types";
import { useMemo, useState } from "react";
import { workspaceTicketListGroups } from "@/features/tickets/workspace-adapter";
import { TicketWorkspaceDisplay } from "./ticket-workspace-display";
import { WorkspaceHeader } from "./workspace-header";
import { UnavailableState } from "./workspace-states";
import {
  WorkspaceSettingsDialog,
  type WorkspaceSettingsSection,
} from "./workspace-settings-dialog";
import {
  unavailableLinkTargetSearchAction,
  unavailableNotificationMarkReadAction,
  unavailableNotificationsAction,
  unavailableTicketAiSummaryAction,
  unavailableTicketDetailAction,
} from "./ticket-workspace-fallbacks";
import type { TicketWorkspaceProps } from "./ticket-workspace-types";
import { workspaceSavedViewOptionsFromSettingsData } from "./workspace-saved-view-options";
import { workspaceSettingsConnectionFromMenu } from "./workspace-settings-connections";

export { workspaceSavedViewOptionsFromSettingsData } from "./workspace-saved-view-options";
export function TicketWorkspace({
  changePasswordAction,
  columns,
  communicationCapabilities,
  connections,
  connectionProviderOptions = [],
  createConnectionAction,
  deleteSavedViewAction,
  deleteManagedUserAction,
  deleteConnectionAction,
  deleteWorkspaceAiRephraseStyleAction,
  detail,
  detailResult,
  disableConnectionAction,
  listResult,
  loadTicketDetailAction,
  loadTicketListPageAction,
  loadAiPromptCenterAction,
  loadMyStyleAction,
  loadUserManagementAction,
  loadSavedViewsSettingsAction,
  loadWorkspaceNotificationsAction,
  loadWorkspaceAiSettingsAction,
  logoutAction,
  markWorkspaceNotificationsReadAction,
  metadataMutationCapabilities,
  rows,
  searchTicketLinkTargetsAction,
  summarizeTicketAction,
  synchronizeWorkspaceTaskbarAction,
  savedViews,
  initialTicketAiSummary,
  initialAiSettingsData,
  initialSavedViewSettingsData,
  reorderSavedViewsAction,
  initialWorkspaceOpenTabsState,
  rephraseStyleOptions: initialRephraseStyleOptions = [],
  resetUserAiRephraseStyleOverrideAction,
  resetManagedUserPasswordAction,
  resetMyStyleAction,
  resetWorkspaceAiPromptAction,
  saveWorkspaceOpenTabsStateAction,
  saveWorkspaceSelectedSavedViewAction,
  moveWorkspaceAiRephraseStyleAction,
  rewriteDraftAction,
  saveUserWorkspaceAiSettingsAction,
  saveMyStyleAction,
  saveManagedUserAction,
  saveUserAiRephraseStyleOverrideAction,
  saveWorkspaceAiRephraseStyleAction,
  saveWorkspaceAiSettingsAction,
  saveWorkspaceAiPromptAction,
  saveSavedViewAction,
  selectedSavedViewId,
  selectedTicketId,
  setActiveConnectionAction,
  setDefaultSavedViewAction,
  tabs,
  updateConnectionAction,
  updateTicketMetadataAction,
  updateAvatarAction,
  updateProfileAction,
  userAvatarDataUrl = null,
  userDisplayName = null,
  userEmail,
  userFirstName = null,
  userId,
  userLastName = null,
  userRole = "USER",
  validateConnectionAction,
}: TicketWorkspaceProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<WorkspaceSettingsSection>("workspaces");
  const [workspaceSavedViewOptions, setWorkspaceSavedViewOptions] = useState<
    WorkspaceSavedView[]
  >(() => savedViews ?? [{ id: allTicketsSavedViewId, label: "All tickets" }]);
  const [savedViewSettingsData, setSavedViewSettingsData] = useState(
    initialSavedViewSettingsData,
  );
  const [aiSettingsData, setAiSettingsData] = useState(initialAiSettingsData);
  const [rephraseStyleOptions, setRephraseStyleOptions] = useState(
    initialRephraseStyleOptions,
  );
  const [profileUser, setProfileUser] = useState({
    avatarDataUrl: userAvatarDataUrl,
    displayName: userDisplayName,
    firstName: userFirstName,
    lastName: userLastName,
  });
  const providedLoadTicketDetailAction = Boolean(loadTicketDetailAction);
  const effectiveLoadTicketDetailAction =
    loadTicketDetailAction ?? unavailableTicketDetailAction;
  const effectiveLoadWorkspaceNotificationsAction =
    loadWorkspaceNotificationsAction ?? unavailableNotificationsAction;
  const effectiveMarkWorkspaceNotificationsReadAction =
    markWorkspaceNotificationsReadAction ??
    unavailableNotificationMarkReadAction;
  const effectiveSummarizeTicketAction =
    summarizeTicketAction ?? unavailableTicketAiSummaryAction;
  const effectiveMetadataMutationCapabilities =
    metadataMutationCapabilities ??
    (listResult.status === "available"
      ? listResult.metadataMutationCapabilities
      : undefined);
  const effectiveCommunicationCapabilities =
    communicationCapabilities ??
    (listResult.status === "available"
      ? listResult.communicationCapabilities
      : noTicketCommunicationCapabilities);
  const settingsConnections = useMemo(
    () => connections.map(workspaceSettingsConnectionFromMenu),
    [connections],
  );
  const activeWorkspace = connections.find((connection) => connection.active);
  const activeWorkspaceId = activeWorkspace?.id;

  function openSettings(section: WorkspaceSettingsSection) {
    setSettingsSection(section);
    setSettingsOpen(true);
  }

  return (
    <main className="flex h-screen min-h-screen flex-col overflow-hidden">
      {listResult.status === "unavailable" ? (
        <>
          <WorkspaceHeader
            connections={connections}
            logoutAction={logoutAction}
            onOpenSettings={openSettings}
            setActiveConnectionAction={setActiveConnectionAction}
            userAvatarDataUrl={profileUser.avatarDataUrl}
            userDisplayName={profileUser.displayName}
            userEmail={userEmail}
            userFirstName={profileUser.firstName}
            userLastName={profileUser.lastName}
          />
          <UnavailableState
            onOpenWorkspaces={() => openSettings("workspaces")}
            reason={listResult.reason}
          />
        </>
      ) : (
        <TicketWorkspaceDisplay
          key={`${activeWorkspaceId ?? "none"}:${activeWorkspace?.connectionId ?? "none"}:${activeWorkspace?.identityVersion ?? "none"}`}
          columns={columns}
          communicationCapabilities={effectiveCommunicationCapabilities}
          connections={connections}
          detail={detail}
          detailResult={detailResult}
          loadTicketDetailAction={effectiveLoadTicketDetailAction}
          loadTicketListPageAction={loadTicketListPageAction}
          loadWorkspaceNotificationsAction={
            effectiveLoadWorkspaceNotificationsAction
          }
          logoutAction={logoutAction}
          markWorkspaceNotificationsReadAction={effectiveMarkWorkspaceNotificationsReadAction}
          metadataMutationCapabilities={effectiveMetadataMutationCapabilities}
          providerGroupingEnabled={
            listResult.queryCapabilities?.providerGrouping === true
          }
          nextListCursor={listResult.nextCursor}
          initialListGroups={workspaceTicketListGroups(listResult.buckets)}
          providerSortEnabled={listResult.queryCapabilities?.providerSort === true}
          refreshTicketDetailAfterMetadataSave={providedLoadTicketDetailAction}
          rows={rows}
          savedViews={workspaceSavedViewOptions}
          initialWorkspaceOpenTabsState={initialWorkspaceOpenTabsState}
          saveWorkspaceOpenTabsStateAction={saveWorkspaceOpenTabsStateAction}
          saveWorkspaceSelectedSavedViewAction={saveWorkspaceSelectedSavedViewAction}
          selectedSavedViewId={selectedSavedViewId ?? allTicketsSavedViewId}
          selectedTicketId={selectedTicketId}
          setActiveConnectionAction={setActiveConnectionAction}
          searchTicketLinkTargetsAction={
            searchTicketLinkTargetsAction ?? unavailableLinkTargetSearchAction
          }
          summarizeTicketAction={effectiveSummarizeTicketAction}
          synchronizeWorkspaceTaskbarAction={synchronizeWorkspaceTaskbarAction}
          initialTicketAiSummary={initialTicketAiSummary}
          rewriteDraftAction={rewriteDraftAction}
          rephraseStyleOptions={rephraseStyleOptions}
          tabs={tabs}
          totalListCount={listResult.totalCount}
          updateTicketMetadataAction={updateTicketMetadataAction}
          userAvatarDataUrl={profileUser.avatarDataUrl}
          userDisplayName={profileUser.displayName}
          userEmail={userEmail}
          userFirstName={profileUser.firstName}
          userId={userId}
          workspaceId={activeWorkspaceId}
          helpdeskConnectionId={activeWorkspace?.connectionId ?? undefined}
          identityVersion={activeWorkspace?.identityVersion ?? undefined}
          userLastName={profileUser.lastName}
          onOpenSettings={openSettings}
        />
      )}
      {settingsOpen ? (
        <WorkspaceSettingsDialog
          changePasswordAction={changePasswordAction}
          connections={settingsConnections}
          createConnectionAction={createConnectionAction}
          deleteConnectionAction={deleteConnectionAction}
          deleteManagedUserAction={deleteManagedUserAction}
          deleteSavedViewAction={deleteSavedViewAction}
          deleteWorkspaceAiRephraseStyleAction={deleteWorkspaceAiRephraseStyleAction}
          disableConnectionAction={disableConnectionAction}
          initialSection={settingsSection}
          initialSavedViewData={savedViewSettingsData}
          initialAiSettingsData={aiSettingsData}
          loadWorkspaceAiSettingsAction={loadWorkspaceAiSettingsAction}
          loadAiPromptCenterAction={loadAiPromptCenterAction}
          loadMyStyleAction={loadMyStyleAction}
          loadSavedViewsSettingsAction={loadSavedViewsSettingsAction}
          loadUserManagementAction={loadUserManagementAction}
          onClose={() => setSettingsOpen(false)}
          onSavedViewDataChange={(data) => {
            setSavedViewSettingsData(data);
            setWorkspaceSavedViewOptions((currentOptions) =>
              workspaceSavedViewOptionsFromSettingsData(
                data,
                currentOptions,
                listResult.status === "available"
                  ? listResult.queryCapabilities
                  : undefined,
              ),
            );
          }}
          onRephraseStylesChange={setRephraseStyleOptions}
          providerOptions={connectionProviderOptions}
          resetMyStyleAction={resetMyStyleAction}
          resetManagedUserPasswordAction={resetManagedUserPasswordAction}
          resetUserAiRephraseStyleOverrideAction={
            resetUserAiRephraseStyleOverrideAction
          }
          resetWorkspaceAiPromptAction={resetWorkspaceAiPromptAction}
          reorderSavedViewsAction={reorderSavedViewsAction}
          onAiSettingsDataChange={setAiSettingsData}
          moveWorkspaceAiRephraseStyleAction={moveWorkspaceAiRephraseStyleAction}
          saveMyStyleAction={saveMyStyleAction}
          saveManagedUserAction={saveManagedUserAction}
          saveSavedViewAction={saveSavedViewAction}
          saveUserWorkspaceAiSettingsAction={saveUserWorkspaceAiSettingsAction}
          saveUserAiRephraseStyleOverrideAction={
            saveUserAiRephraseStyleOverrideAction
          }
          saveWorkspaceAiRephraseStyleAction={saveWorkspaceAiRephraseStyleAction}
          saveWorkspaceAiSettingsAction={saveWorkspaceAiSettingsAction}
          saveWorkspaceAiPromptAction={saveWorkspaceAiPromptAction}
          setActiveConnectionAction={
            setActiveConnectionAction as HelpdeskConnectionFormAction
          }
          setDefaultSavedViewAction={setDefaultSavedViewAction}
          updateConnectionAction={updateConnectionAction}
          updateAvatarAction={updateAvatarAction}
          onProfileUserChange={(user) => {
            setProfileUser({
              avatarDataUrl: user.avatarDataUrl,
              displayName: user.displayName,
              firstName: user.firstName,
              lastName: user.lastName,
            });
          }}
          updateProfileAction={updateProfileAction}
          userAvatarDataUrl={profileUser.avatarDataUrl}
          userDisplayName={profileUser.displayName}
          userEmail={userEmail}
          userFirstName={profileUser.firstName}
          userLastName={profileUser.lastName}
          userRole={userRole}
          validateConnectionAction={validateConnectionAction}
        />
      ) : null}
    </main>
  );
}
