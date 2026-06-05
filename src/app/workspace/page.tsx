import { requireCurrentUser } from "@/auth/current-user";
import { env } from "@/config/env";
import { prismaHelpdeskConnectionsRepository } from "@/data/helpdesk-connections-repository";
import { prismaTicketDetailCacheRepository } from "@/data/ticket-detail-cache-repository";
import { prismaSavedViewsRepository } from "@/data/saved-views-repository";
import { prismaWorkspaceTabsRepository } from "@/data/workspace-tabs-repository";
import type { TicketListQueryInput } from "@/core/providers";
import { logoutAction } from "@/features/auth/actions";
import { summarizeWorkspaceTicketAction } from "@/features/ai";
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
  type StoredSavedView,
} from "@/features/saved-views";
import { unavailableTicketRead } from "@/features/tickets/read-model";
import {
  deleteWorkspaceSavedViewAction,
  loadWorkspaceSavedViewsSettingsAction,
  reorderWorkspaceSavedViewsAction,
  saveWorkspaceSavedViewAction,
  setDefaultWorkspaceSavedViewAction,
} from "@/features/saved-views/actions";
import { savedViewSettingsDataFromStored } from "@/features/saved-views/settings-model";
import { TicketWorkspace } from "@/features/workspace/components/ticket-workspace";
import { providerRegistry } from "@/providers";

type WorkspacePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function savedViewTicketListQuery(
  savedView: StoredSavedView | undefined,
): TicketListQueryInput | undefined {
  if (!savedView) {
    return undefined;
  }

  const providerBackedGroup =
    savedView.query.group?.key === "state" ||
    savedView.query.group?.key === "priority"
      ? savedView.query.group
      : undefined;

  return {
    filter: savedView.query.filter,
    ...(savedView.query.sort ? { sort: savedView.query.sort } : {}),
    ...(providerBackedGroup
      ? { count: { includeTotal: true }, group: providerBackedGroup }
      : {}),
  };
}

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

  return (
    <TicketWorkspace
      columns={defaultWorkspaceTicketColumns}
      connections={connections.map((connection) => ({
        id: connection.id,
        label: connection.displayName,
        providerKey: connection.providerKey,
        providerLabel: connection.providerLabel,
        baseUrl: connection.baseUrl,
        status: connection.status,
        active: connection.active,
      }))}
      connectionProviderOptions={listConnectionProviderOptions(providerRegistry)}
      createConnectionAction={createHelpdeskConnectionAction}
      deleteConnectionAction={deleteHelpdeskConnectionAction}
      detail={detail}
      detailResult={workspaceDetailResult}
      disableConnectionAction={disableHelpdeskConnectionAction}
      listResult={listResult}
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
      initialSavedViewSettingsData={savedViewSettingsDataFromStored({
        views: savedViews,
        currentUser: currentHelpdeskUser,
        canManageShared: user.role === "ADMIN",
      })}
      reorderSavedViewsAction={reorderWorkspaceSavedViewsAction}
      saveWorkspaceOpenTabsStateAction={saveWorkspaceOpenTabsStateAction}
      saveSavedViewAction={saveWorkspaceSavedViewAction}
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
      updateTicketMetadataAction={updateTicketMetadataAction}
      userEmail={user.email}
      userRole={user.role}
      validateConnectionAction={validateHelpdeskConnectionAction}
    />
  );
}
