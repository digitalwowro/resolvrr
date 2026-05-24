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
  const detail =
    detailResult?.status === "available"
      ? workspaceTicketDetail(detailResult.detail)
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
      detailResult={detailResult}
      listResult={listResult}
      logoutAction={logoutAction}
      rows={rows}
      selectedTicketId={selectedTicketId}
      setActiveConnectionAction={setActiveHelpdeskConnectionAction}
      tabs={workspaceTicketTabs(rows)}
      userEmail={user.email}
    />
  );
}
