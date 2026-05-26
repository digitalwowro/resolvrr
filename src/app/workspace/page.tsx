import { requireCurrentUser } from "@/auth/current-user";
import { env } from "@/config/env";
import { prismaHelpdeskConnectionsRepository } from "@/data/helpdesk-connections-repository";
import { logoutAction } from "@/features/auth/actions";
import {
  listConnectionsForUser,
  setActiveHelpdeskConnectionAction,
} from "@/features/helpdesk-connections";
import {
  defaultWorkspaceTicketColumns,
  loadWorkspaceTicketDetail,
  loadWorkspaceTicketList,
  selectedTicketExternalId,
  workspaceTicketDetail,
  workspaceTicketRows,
  workspaceTicketTabs,
} from "@/features/tickets";
import { updateTicketMetadataAction } from "@/features/tickets/actions";
import { loadWorkspaceTicketDetailAction } from "@/features/tickets/detail-actions";
import { loadWorkspaceTicketListPageAction } from "@/features/tickets/list-actions";
import { TicketWorkspace } from "@/features/workspace/components/ticket-workspace";
import { providerRegistry } from "@/providers";

type WorkspacePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function WorkspacePage({ searchParams }: WorkspacePageProps) {
  const user = await requireCurrentUser();
  const params = await searchParams;
  const [listResult, connections] = await Promise.all([
    loadWorkspaceTicketList(
      prismaHelpdeskConnectionsRepository,
      providerRegistry,
      env.APP_ENCRYPTION_KEY,
      user.id,
    ),
    listConnectionsForUser(
      prismaHelpdeskConnectionsRepository,
      providerRegistry,
      user.id,
    ),
  ]);

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
        active: connection.active,
      }))}
      detail={detail}
      detailResult={workspaceDetailResult}
      listResult={listResult}
      loadTicketDetailAction={loadWorkspaceTicketDetailAction}
      loadTicketListPageAction={loadWorkspaceTicketListPageAction}
      logoutAction={logoutAction}
      metadataMutationCapabilities={
        listResult.status === "available"
          ? listResult.metadataMutationCapabilities
          : undefined
      }
      rows={rows}
      selectedTicketId={selectedTicketId}
      setActiveConnectionAction={setActiveHelpdeskConnectionAction}
      tabs={workspaceTicketTabs(rows)}
      updateTicketMetadataAction={updateTicketMetadataAction}
      userEmail={user.email}
    />
  );
}
