import type {
  TicketDetailReadResult,
  TicketListReadResult,
  WorkspaceTicketColumn,
  WorkspaceTicketDetail,
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
  detailResult?: TicketDetailReadResult;
  listResult: TicketListReadResult;
  logoutAction(formData: FormData): void | Promise<void>;
  rows: WorkspaceTicketRow[];
  selectedTicketId?: string;
  setActiveConnectionAction(formData: FormData): void | Promise<void>;
  tabs: WorkspaceTicketTab[];
  userEmail: string;
};

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
  logoutAction,
  rows,
  selectedTicketId,
  setActiveConnectionAction,
  tabs,
  userEmail,
}: TicketWorkspaceProps) {
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
          rows={rows}
          selectedTicketId={selectedTicketId}
          tabs={tabs}
        />
      )}
    </main>
  );
}
