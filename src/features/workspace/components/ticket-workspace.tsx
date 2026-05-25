import type {
  LoadWorkspaceTicketDetailAction,
  TicketListReadResult,
  TicketMetadataMutationActionState,
  TicketMetadataMutationCapabilities,
  WorkspaceTicketColumn,
  WorkspaceTicketDetail,
  WorkspaceTicketDetailLoadResult,
  WorkspaceTicketRow,
  WorkspaceTicketTab,
} from "@/features/tickets";
import { TicketWorkspaceDisplay } from "./ticket-workspace-display";
import {
  type WorkspaceMenuConnection,
  type WorkspaceProfileAction,
  WorkspaceHeader,
} from "./workspace-header";
import { UnavailableState } from "./workspace-states";

type TicketWorkspaceProps = {
  columns: WorkspaceTicketColumn[];
  connections: WorkspaceMenuConnection[];
  detail?: WorkspaceTicketDetail;
  detailResult?: WorkspaceTicketDetailLoadResult;
  listResult: TicketListReadResult;
  loadTicketDetailAction?: LoadWorkspaceTicketDetailAction;
  logoutAction(formData: FormData): void | Promise<void>;
  metadataMutationCapabilities?: TicketMetadataMutationCapabilities;
  rows: WorkspaceTicketRow[];
  selectedTicketId?: string;
  setActiveConnectionAction(formData: FormData): void | Promise<void>;
  tabs: WorkspaceTicketTab[];
  updateTicketMetadataAction(
    formData: FormData,
  ): Promise<TicketMetadataMutationActionState>;
  userEmail: string;
};

const unavailableTicketDetailAction: LoadWorkspaceTicketDetailAction = async () => ({
  status: "unavailable",
  reason: "provider-temporary-failure",
  retryable: true,
});

const profileActions: WorkspaceProfileAction[] = [
  {
    id: "manage-workspaces",
    label: "Manage workspaces",
    href: "/workspace/connections",
  },
];

export function TicketWorkspace({
  columns,
  connections,
  detail,
  detailResult,
  listResult,
  loadTicketDetailAction = unavailableTicketDetailAction,
  logoutAction,
  metadataMutationCapabilities,
  rows,
  selectedTicketId,
  setActiveConnectionAction,
  tabs,
  updateTicketMetadataAction,
  userEmail,
}: TicketWorkspaceProps) {
  const effectiveMetadataMutationCapabilities =
    metadataMutationCapabilities ??
    (listResult.status === "available"
      ? listResult.metadataMutationCapabilities
      : undefined);

  return (
    <main className="flex h-screen min-h-screen flex-col overflow-hidden">
      <WorkspaceHeader
        actions={profileActions}
        connections={connections}
        logoutAction={logoutAction}
        setActiveConnectionAction={setActiveConnectionAction}
        userEmail={userEmail}
      />
      {listResult.status === "unavailable" ? (
        <UnavailableState reason={listResult.reason} />
      ) : (
        <TicketWorkspaceDisplay
          columns={columns}
          detail={detail}
          detailResult={detailResult}
          loadTicketDetailAction={loadTicketDetailAction}
          metadataMutationCapabilities={effectiveMetadataMutationCapabilities}
          rows={rows}
          selectedTicketId={selectedTicketId}
          tabs={tabs}
          updateTicketMetadataAction={updateTicketMetadataAction}
        />
      )}
    </main>
  );
}
