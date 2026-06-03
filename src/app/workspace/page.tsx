import { requireCurrentUser } from "@/auth/current-user";
import { env } from "@/config/env";
import { prismaHelpdeskConnectionsRepository } from "@/data/helpdesk-connections-repository";
import { prismaSavedViewsRepository } from "@/data/saved-views-repository";
import { prismaWorkspaceTabsRepository } from "@/data/workspace-tabs-repository";
import type { TicketListQueryInput } from "@/core/providers";
import { logoutAction } from "@/features/auth/actions";
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
import { loadWorkspaceTicketDetailAction } from "@/features/tickets/detail-actions";
import { loadWorkspaceTicketListPageAction } from "@/features/tickets/list-actions";
import { searchWorkspaceTicketLinkTargetsAction } from "@/features/tickets/link-target-actions";
import {
  loadWorkspaceNotificationsAction,
  markWorkspaceNotificationsReadAction,
} from "@/features/notifications";
import { saveWorkspaceOpenTabsStateAction } from "@/features/workspace/actions";
import {
  defaultWorkspaceSavedViewId,
  workspaceSavedViews,
  type StoredSavedView,
} from "@/features/saved-views";
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
  const savedViews = await prismaSavedViewsRepository.listForUser(
    user.id,
    activeConnection?.id,
  );
  const activeProvider = activeConnection
    ? providerRegistry.get(activeConnection.providerKey)
    : undefined;
  const activeQueryCapabilities = activeProvider
    ? ticketListQueryCapabilities(activeProvider.capabilities)
    : undefined;
  const selectedSavedViewId = defaultWorkspaceSavedViewId(
    savedViews,
    activeQueryCapabilities,
  );
  const selectedSavedView = savedViews.find(
    (savedView) => savedView.id === selectedSavedViewId,
  );
  const listResult = await loadWorkspaceTicketList(
    prismaHelpdeskConnectionsRepository,
    providerRegistry,
    env.APP_ENCRYPTION_KEY,
    user.id,
    savedViewTicketListQuery(selectedSavedView),
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
      initialWorkspaceOpenTabsState={initialWorkspaceOpenTabsState}
      saveWorkspaceOpenTabsStateAction={saveWorkspaceOpenTabsStateAction}
      searchTicketLinkTargetsAction={searchWorkspaceTicketLinkTargetsAction}
      savedViews={workspaceSavedViews(
        savedViews,
        listResult.status === "available"
          ? listResult.queryCapabilities
          : activeQueryCapabilities,
      )}
      selectedSavedViewId={selectedSavedViewId}
      selectedTicketId={selectedTicketId}
      setActiveConnectionAction={setActiveHelpdeskConnectionAction}
      tabs={workspaceTicketTabs(rows)}
      updateConnectionAction={updateHelpdeskConnectionAction}
      updateTicketMetadataAction={updateTicketMetadataAction}
      userEmail={user.email}
      validateConnectionAction={validateHelpdeskConnectionAction}
    />
  );
}
