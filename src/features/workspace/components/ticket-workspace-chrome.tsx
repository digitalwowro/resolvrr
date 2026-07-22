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
import { WorkspaceControls } from "./workspace-controls";
import type { WorkspaceSettingsSection } from "./workspace-settings-dialog";
import { WorkspaceNotifications } from "./workspace-notifications";
import { TicketTabsPanel } from "./ticket-tabs-panel";
import type { TicketTabOrientation } from "./ticket-tabs-panel";
import type { WorkspaceTicketSearchProps } from "./workspace-ticket-search";

type WorkspaceHeaderChromeProps = {
  activeTicketId?: string;
  connections: WorkspaceMenuConnection[];
  loadNotificationsAction: LoadWorkspaceNotificationsAction;
  logoutAction(formData: FormData): void | Promise<void>;
  markNotificationsReadAction: MarkWorkspaceNotificationsReadAction;
  onOpenSettings(section: WorkspaceSettingsSection): void;
  onOpenNotificationTicket(tab: WorkspaceTicketTab): void;
  onRefreshTicket(ticketId: string): void;
  onSyncTabs?(): void;
  onTabOrientationChange(orientation: TicketTabOrientation): void;
  recentTickets: WorkspaceTicketTab[];
  ticketSearch: WorkspaceTicketSearchProps;
  setActiveConnectionAction(
    formData: FormData,
  ): void | Promise<void | HelpdeskConnectionActionResult>;
  tabOrientation: TicketTabOrientation;
  syncingTabs?: boolean;
  userAvatarDataUrl?: string | null;
  userDisplayName?: string | null;
  userEmail: string;
  userFirstName?: string | null;
  userLastName?: string | null;
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
  onSyncTabs,
  onTabOrientationChange,
  recentTickets,
  ticketSearch,
  setActiveConnectionAction,
  tabOrientation,
  syncingTabs,
  userAvatarDataUrl,
  userDisplayName,
  userEmail,
  userFirstName,
  userLastName,
}: WorkspaceHeaderChromeProps) {
  const controls = (
    <WorkspaceControls
      onTabOrientationChange={onTabOrientationChange}
      onSyncTabs={onSyncTabs}
      syncingTabs={syncingTabs}
      tabOrientation={tabOrientation}
      tone="dark"
    />
  );
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
      controls={controls}
      notifications={notifications}
      logoutAction={logoutAction}
      onOpenSettings={onOpenSettings}
      ticketSearch={ticketSearch}
      setActiveConnectionAction={setActiveConnectionAction}
      userAvatarDataUrl={userAvatarDataUrl}
      userDisplayName={userDisplayName}
      userEmail={userEmail}
      userFirstName={userFirstName}
      userLastName={userLastName}
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
