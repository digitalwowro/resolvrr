import { requireCurrentUser } from "@/auth/current-user";
import { env } from "@/config/env";
import { prismaHelpdeskConnectionsRepository } from "@/data/helpdesk-connections-repository";
import { prismaAiRephraseStyleRepository } from "@/data/ai-rephrase-styles-repository";
import { prismaTicketDetailCacheRepository } from "@/data/ticket-detail-cache-repository";
import { prismaSavedViewsRepository } from "@/data/saved-views-repository";
import { prismaWorkspaceTabsRepository } from "@/data/workspace-tabs-repository";
import {
  changePasswordAction,
  logoutAction,
  updateAvatarAction,
  updateProfileAction,
} from "@/features/auth/actions";
import {
  loadAiPromptCenterAction,
  loadAiRephraseStylesAction,
  loadMyStyleAction,
  loadWorkspaceAiSettingsAction,
  resetMyStyleAction,
  resetUserAiRephraseStyleOverrideAction,
  resetWorkspaceAiPromptAction,
  rewriteDraftAction,
  saveMyStyleAction,
  saveUserWorkspaceAiSettingsAction,
  saveUserAiRephraseStyleOverrideAction,
  saveWorkspaceAiRephraseStyleAction,
  saveWorkspaceAiSettingsAction,
  saveWorkspaceAiPromptAction,
  deleteWorkspaceAiRephraseStyleAction,
  moveWorkspaceAiRephraseStyleAction,
  summarizeWorkspaceTicketAction,
} from "@/features/ai";
import { loadAiRephraseStyles } from "@/features/ai/rephrase-style-service";
import { loadInitialTicketAiSummary } from "@/features/ai/ticket-summary-hydration";
import {
  createHelpdeskConnectionAction,
  deleteHelpdeskConnectionAction,
  disableHelpdeskConnectionAction,
  listConnectionsForUser,
  listConnectionProviderOptions,
  setActiveHelpdeskConnectionAction,
  updateHelpdeskConnectionAction,
  validateHelpdeskConnectionAction,
} from "@/features/helpdesk-connections";
import {
  defaultWorkspaceTicketColumns,
  loadWorkspaceTicketDetail,
  loadWorkspaceTicketList,
  selectedTicketExternalId,
  ticketListQueryCapabilities,
  workspaceTicketDetail,
  workspaceTicketRows,
  workspaceTicketTabs,
} from "@/features/tickets";
import { updateTicketMetadataAction } from "@/features/tickets/actions";
import { loadActiveTicketProviderContext } from "@/features/tickets/connection-context";
import { loadWorkspaceTicketDetailAction } from "@/features/tickets/detail-actions";
import { loadWorkspaceTicketListPageAction } from "@/features/tickets/list-actions";
import { searchWorkspaceTicketLinkTargetsAction } from "@/features/tickets/link-target-actions";
import { dispatchCurrentHelpdeskUserRead } from "@/features/tickets/provider-dispatch";
import {
  loadWorkspaceNotificationsAction,
  markWorkspaceNotificationsReadAction,
} from "@/features/notifications";
import { saveWorkspaceOpenTabsStateAction } from "@/features/workspace/actions";
import {
  ensureMyWorkSavedViewResult,
  initialWorkspaceSavedViewSelection,
  workspaceSavedViews,
  type EnsureMyWorkSavedViewResult,
} from "@/features/saved-views";
import { unavailableTicketRead } from "@/features/tickets/read-model";
import {
  deleteWorkspaceSavedViewAction,
  loadWorkspaceSavedViewsSettingsAction,
  reorderWorkspaceSavedViewsAction,
  saveWorkspaceSavedViewAction,
  setDefaultWorkspaceSavedViewAction,
} from "@/features/saved-views/actions";
import {
  deleteManagedUserAction,
  loadUserManagementAction,
  resetManagedUserPasswordAction,
  saveManagedUserAction,
} from "@/features/user-management";
import { savedViewSettingsDataFromStored } from "@/features/saved-views/settings-model";
import { TicketWorkspace } from "@/features/workspace/components/ticket-workspace";
import { providerRegistry } from "@/providers";
import {
  savedViewTicketListQuery,
  workspaceMenuConnections,
} from "./workspace-page-helpers";

type WorkspacePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function WorkspacePage({ searchParams }: WorkspacePageProps) {
  const user = await requireCurrentUser();
  const params = await searchParams;
  const connections = await listConnectionsForUser(
    prismaHelpdeskConnectionsRepository,
    providerRegistry,
    user.id,
  );
  const activeConnection = connections.find((connection) => connection.active);
  const initialWorkspaceOpenTabsState = activeConnection
    ? await prismaWorkspaceTabsRepository.getForUser(user.id, activeConnection.id)
    : undefined;
  const activeProvider = activeConnection
    ? providerRegistry.get(activeConnection.providerKey)
    : undefined;
  const activeQueryCapabilities = activeProvider
    ? ticketListQueryCapabilities(activeProvider.capabilities)
    : undefined;
  let currentHelpdeskUser;
  if (activeConnection) {
    const providerContext = await loadActiveTicketProviderContext(
      prismaHelpdeskConnectionsRepository,
      providerRegistry,
      env.APP_ENCRYPTION_KEY,
      user.id,
      "list",
    );
    if (providerContext.status === "available") {
      const currentUserLookup =
        await dispatchCurrentHelpdeskUserRead(providerContext.value);
      currentHelpdeskUser =
        currentUserLookup.status === "available"
          ? currentUserLookup.options[0]
          : undefined;
    }
  }
  const savedViewSeedResult: EnsureMyWorkSavedViewResult = activeConnection
    ? await ensureMyWorkSavedViewResult(
        prismaSavedViewsRepository,
        activeProvider?.capabilities ?? [],
        user.id,
        activeConnection.id,
        currentHelpdeskUser,
      )
    : { status: "available", views: [] };
  const savedViews = savedViewSeedResult.views;
  const savedViewSelection = initialWorkspaceSavedViewSelection({
    savedViews,
    capabilities: activeQueryCapabilities,
    blockUnfilteredFallback:
      savedViewSeedResult.status === "unavailable" &&
      savedViewSeedResult.reason === "current-user-unavailable",
  });
  const selectedSavedViewId =
    savedViewSelection.status === "selected"
      ? savedViewSelection.selectedSavedViewId
      : undefined;
  const listResult =
    savedViewSelection.status === "blocked"
      ? unavailableTicketRead("unsupported-capability")
      : await loadWorkspaceTicketList(
          prismaHelpdeskConnectionsRepository,
          providerRegistry,
          env.APP_ENCRYPTION_KEY,
          user.id,
          savedViewTicketListQuery(savedViewSelection.selectedSavedView),
        );

  const rows =
    listResult.status === "available"
      ? workspaceTicketRows(listResult.tickets)
      : [];
  const selectedTicketId = selectedTicketExternalId(params.ticket);
  const detailResult =
    listResult.status === "available" && selectedTicketId
      ? await loadWorkspaceTicketDetail(
          prismaHelpdeskConnectionsRepository,
          providerRegistry,
          env.APP_ENCRYPTION_KEY,
          user.id,
          selectedTicketId,
          prismaTicketDetailCacheRepository,
        )
      : undefined;
  const workspaceDetailResult =
    detailResult?.status === "available"
      ? {
          status: "available" as const,
          detail: workspaceTicketDetail(detailResult.detail),
        }
      : detailResult;
  const detail =
    workspaceDetailResult?.status === "available"
      ? workspaceDetailResult.detail
      : undefined;
  const initialCachedSummary =
    detailResult?.status === "available" && detailResult.helpdeskConnectionId
      ? await loadInitialTicketAiSummary({
          detail: detailResult.detail,
          helpdeskConnectionId: detailResult.helpdeskConnectionId,
          ticketExternalId: selectedTicketId ?? detailResult.detail.ticket.externalId,
          userId: user.id,
        })
      : undefined;
  const initialRephraseStyles = await loadAiRephraseStyles({
    connectionRepository: prismaHelpdeskConnectionsRepository,
    styleRepository: prismaAiRephraseStyleRepository,
    userId: user.id,
  });

  return (
    <TicketWorkspace
      changePasswordAction={changePasswordAction}
      columns={defaultWorkspaceTicketColumns}
      connections={workspaceMenuConnections(connections)}
      connectionProviderOptions={listConnectionProviderOptions(providerRegistry)}
      createConnectionAction={createHelpdeskConnectionAction}
      deleteConnectionAction={deleteHelpdeskConnectionAction}
      deleteManagedUserAction={deleteManagedUserAction}
      deleteWorkspaceAiRephraseStyleAction={deleteWorkspaceAiRephraseStyleAction}
      detail={detail}
      detailResult={workspaceDetailResult}
      disableConnectionAction={disableHelpdeskConnectionAction}
      listResult={listResult}
      loadAiPromptCenterAction={loadAiPromptCenterAction}
      loadAiRephraseStylesAction={loadAiRephraseStylesAction}
      loadMyStyleAction={loadMyStyleAction}
      loadUserManagementAction={loadUserManagementAction}
      loadWorkspaceAiSettingsAction={loadWorkspaceAiSettingsAction}
      loadTicketDetailAction={loadWorkspaceTicketDetailAction}
      loadTicketListPageAction={loadWorkspaceTicketListPageAction}
      loadWorkspaceNotificationsAction={loadWorkspaceNotificationsAction}
      loadSavedViewsSettingsAction={loadWorkspaceSavedViewsSettingsAction}
      logoutAction={logoutAction}
      markWorkspaceNotificationsReadAction={
        markWorkspaceNotificationsReadAction
      }
      metadataMutationCapabilities={
        listResult.status === "available"
          ? listResult.metadataMutationCapabilities
          : undefined
      }
      rows={rows}
      deleteSavedViewAction={deleteWorkspaceSavedViewAction}
      initialWorkspaceOpenTabsState={initialWorkspaceOpenTabsState}
      initialTicketAiSummary={
        initialCachedSummary && selectedTicketId
          ? { result: initialCachedSummary, ticketId: selectedTicketId }
          : undefined
      }
      initialSavedViewSettingsData={savedViewSettingsDataFromStored({
        views: savedViews,
        currentUser: currentHelpdeskUser,
        canManageShared: user.role === "ADMIN",
      })}
      initialAiSettingsData={await loadWorkspaceAiSettingsAction()}
      reorderSavedViewsAction={reorderWorkspaceSavedViewsAction}
      rephraseStyleOptions={initialRephraseStyles.styles}
      resetUserAiRephraseStyleOverrideAction={
        resetUserAiRephraseStyleOverrideAction
      }
      resetMyStyleAction={resetMyStyleAction}
      resetManagedUserPasswordAction={resetManagedUserPasswordAction}
      resetWorkspaceAiPromptAction={resetWorkspaceAiPromptAction}
      rewriteDraftAction={rewriteDraftAction}
      saveManagedUserAction={saveManagedUserAction}
      saveMyStyleAction={saveMyStyleAction}
      moveWorkspaceAiRephraseStyleAction={moveWorkspaceAiRephraseStyleAction}
      saveWorkspaceOpenTabsStateAction={saveWorkspaceOpenTabsStateAction}
      saveSavedViewAction={saveWorkspaceSavedViewAction}
      saveUserWorkspaceAiSettingsAction={saveUserWorkspaceAiSettingsAction}
      saveUserAiRephraseStyleOverrideAction={saveUserAiRephraseStyleOverrideAction}
      saveWorkspaceAiRephraseStyleAction={saveWorkspaceAiRephraseStyleAction}
      saveWorkspaceAiSettingsAction={saveWorkspaceAiSettingsAction}
      saveWorkspaceAiPromptAction={saveWorkspaceAiPromptAction}
      searchTicketLinkTargetsAction={searchWorkspaceTicketLinkTargetsAction}
      summarizeTicketAction={summarizeWorkspaceTicketAction}
      savedViews={workspaceSavedViews(
        savedViews,
        listResult.status === "available"
          ? listResult.queryCapabilities
          : activeQueryCapabilities,
      )}
      selectedSavedViewId={selectedSavedViewId}
      selectedTicketId={selectedTicketId}
      setActiveConnectionAction={setActiveHelpdeskConnectionAction}
      setDefaultSavedViewAction={setDefaultWorkspaceSavedViewAction}
      tabs={workspaceTicketTabs(rows)}
      updateConnectionAction={updateHelpdeskConnectionAction}
      updateAvatarAction={updateAvatarAction}
      updateProfileAction={updateProfileAction}
      updateTicketMetadataAction={updateTicketMetadataAction}
      userAvatarDataUrl={user.avatarDataUrl}
      userDisplayName={user.displayName}
      userEmail={user.email}
      userFirstName={user.firstName}
      userId={user.id}
      userLastName={user.lastName}
      userRole={user.role}
      validateConnectionAction={validateHelpdeskConnectionAction}
    />
  );
}
