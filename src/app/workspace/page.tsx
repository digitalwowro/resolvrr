import { requireCurrentUser } from "@/auth/current-user";
import { env } from "@/config/env";
import { prismaHelpdeskConnectionsRepository } from "@/data/helpdesk-connections-repository";
import {
  loadWorkspaceTicketDetail,
  loadWorkspaceTicketList,
  selectedTicketExternalId,
  workspaceTicketDetail,
  workspaceTicketRows,
} from "@/features/tickets";
import { TicketWorkspace } from "@/features/workspace/components/ticket-workspace";
import { providerRegistry } from "@/providers";

type WorkspacePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function WorkspacePage({ searchParams }: WorkspacePageProps) {
  const user = await requireCurrentUser();
  const params = await searchParams;
  const listResult = await loadWorkspaceTicketList(
    prismaHelpdeskConnectionsRepository,
    providerRegistry,
    env.APP_ENCRYPTION_KEY,
    user.id,
  );

  const rows =
    listResult.status === "available"
      ? workspaceTicketRows(listResult.tickets)
      : [];
  const selectedTicketId =
    selectedTicketExternalId(params.ticket) ?? rows[0]?.id;
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
      detail={detail}
      detailResult={detailResult}
      listResult={listResult}
      rows={rows}
      selectedTicketId={selectedTicketId}
      userEmail={user.email}
    />
  );
}
