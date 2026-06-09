"use client";

import type {
  LoadWorkspaceNotificationsAction,
  MarkWorkspaceNotificationsReadAction,
} from "@/features/notifications";
import type { HelpdeskConnectionActionResult } from "@/features/helpdesk-connections";
import type { WorkspaceTicketTab } from "@/features/tickets/workspace-adapter";
import {
  type WorkspaceMenuConnection,
  WorkspaceHeader,
} from "./workspace-header";
import type { WorkspaceSettingsSection } from "./workspace-settings-dialog";
import { WorkspaceNotifications } from "./workspace-notifications";
import { TicketTabsPanel } from "./ticket-tabs-panel";
import type { TicketTabOrientation } from "./ticket-tabs-panel";

type WorkspaceHeaderChromeProps = {
  activeTicketId?: string;
  connections: WorkspaceMenuConnection[];
  loadNotificationsAction: LoadWorkspaceNotificationsAction;
  logoutAction(formData: FormData): void | Promise<void>;
  markNotificationsReadAction: MarkWorkspaceNotificationsReadAction;
  onOpenSettings(section: WorkspaceSettingsSection): void;
  onOpenNotificationTicket(tab: WorkspaceTicketTab): void;
  onRefreshTicket(ticketId: string): void;
  onSearchQueryChange(query: string): void;
  recentTickets: WorkspaceTicketTab[];
  searchQuery: string;
  setActiveConnectionAction(
    formData: FormData,
  ): void | Promise<void | HelpdeskConnectionActionResult>;
  userEmail: string;
};

export function WorkspaceHeaderChrome({
  activeTicketId,
  connections,
  loadNotificationsAction,
  logoutAction,
  markNotificationsReadAction,
  onOpenNotificationTicket,
  onOpenSettings,
  onRefreshTicket,
  onSearchQueryChange,
  recentTickets,
  searchQuery,
  setActiveConnectionAction,
  userEmail,
}: WorkspaceHeaderChromeProps) {
  const notifications = (
    <WorkspaceNotifications
      activeTicketId={activeTicketId}
      loadNotificationsAction={loadNotificationsAction}
      markNotificationsReadAction={markNotificationsReadAction}
      onOpenTicket={onOpenNotificationTicket}
      onRefreshTicket={onRefreshTicket}
      recentTickets={recentTickets}
      tone="dark"
    />
  );

  return (
    <WorkspaceHeader
      connections={connections}
      notifications={notifications}
      logoutAction={logoutAction}
      onOpenSettings={onOpenSettings}
      onSearchQueryChange={onSearchQueryChange}
      searchQuery={searchQuery}
      setActiveConnectionAction={setActiveConnectionAction}
      userEmail={userEmail}
    />
  );
}

type WorkspaceTabsChromeProps = {
  activeTicketId?: string;
  listActive: boolean;
  onCloseTicket(ticketId: string): void;
  onReorderTicket(sourceTicketId: string, targetIndex: number): void;
  onSelectList(): void;
  onSelectTicket(ticketId: string): void;
  orientation: TicketTabOrientation;
  savedViewLabel: string;
  tabs: WorkspaceTicketTab[];
};

export function WorkspaceTabsChrome({
  activeTicketId,
  listActive,
  onCloseTicket,
  onReorderTicket,
  onSelectList,
  onSelectTicket,
  orientation,
  savedViewLabel,
  tabs,
}: WorkspaceTabsChromeProps) {
  return (
    <TicketTabsPanel
      key="tabs"
      activeTicketId={activeTicketId}
      listActive={listActive}
      onCloseTicket={onCloseTicket}
      onSelectList={onSelectList}
      onSelectTicket={onSelectTicket}
      onReorderTicket={onReorderTicket}
      orientation={orientation}
      savedViewLabel={savedViewLabel}
      tabs={tabs}
    />
  );
}
