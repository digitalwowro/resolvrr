"use client";

import { cn } from "@/components/ui/classnames";
import type { WorkspaceNotification } from "@/features/notifications";
import type { WorkspaceTicketTab } from "@/features/tickets/workspace-adapter";
import {
  displayTicketNumber,
  notificationTypeLabels,
  relativeTime,
} from "./workspace-notifications-utils";

type WorkspaceNotificationsPanelProps = {
  activeNotifications: WorkspaceNotification[];
  loadStatus: "idle" | "loading" | "failed";
  markingIds: Set<string>;
  notifications: WorkspaceNotification[];
  onMarkAllRead(): void;
  onNotificationClick(notification: WorkspaceNotification): void;
  onRecentTicketClick(ticket: WorkspaceTicketTab): void;
  onViewChange(view: "active" | "recent"): void;
  recentTicketItems: WorkspaceTicketTab[];
  unreadCount: number;
  unreadIds: string[];
  view: "active" | "recent";
};

export function WorkspaceNotificationsPanel({
  activeNotifications,
  loadStatus,
  markingIds,
  notifications,
  onMarkAllRead,
  onNotificationClick,
  onRecentTicketClick,
  onViewChange,
  recentTicketItems,
  unreadCount,
  unreadIds,
  view,
}: WorkspaceNotificationsPanelProps) {
  return (
    <div
      className="fixed bottom-0 right-3 top-12 z-50 flex w-96 flex-col overflow-hidden rounded-md border border-slate-200 bg-white text-sm shadow-lg"
      role="dialog"
      aria-label="Workspace notifications"
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
        <div>
          <h2 className="font-semibold text-slate-900">Notifications</h2>
          <p className="text-xs text-slate-500">
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            aria-pressed={view === "active"}
            className={cn(
              "rounded-md px-2 py-1 text-xs font-medium hover:bg-slate-100",
              view === "active" ? "text-slate-900" : "text-indigo-700",
            )}
            onClick={() => onViewChange("active")}
            type="button"
          >
            Active
          </button>
          <button
            aria-pressed={view === "recent"}
            className={cn(
              "rounded-md px-2 py-1 text-xs font-medium hover:bg-slate-100",
              view === "recent" ? "text-slate-900" : "text-indigo-700",
            )}
            onClick={() => onViewChange("recent")}
            type="button"
          >
            Recent
          </button>
          {view === "active" ? (
            <button
              className="rounded-md px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-slate-100 disabled:text-slate-400"
              disabled={unreadIds.length === 0 || markingIds.size > 0}
              onClick={onMarkAllRead}
              type="button"
            >
              Mark all read
            </button>
          ) : null}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto py-1">
        {view === "active" && loadStatus === "loading" ? (
          <div className="px-3 py-4 text-slate-500">Loading notifications...</div>
        ) : null}
        {view === "active" &&
        loadStatus === "failed" &&
        notifications.length === 0 ? (
          <div className="px-3 py-4 text-slate-500">
            Notifications unavailable.
          </div>
        ) : null}
        {view === "active" &&
        loadStatus === "idle" &&
        activeNotifications.length === 0 ? (
          <div className="px-3 py-4 text-slate-500">
            No active notifications.
          </div>
        ) : null}
        {view === "active"
          ? activeNotifications.map((notification) => {
              const marking = markingIds.has(notification.id);
              return (
                <button
                  className={cn(
                    "flex w-full gap-3 px-3 py-2 text-left hover:bg-slate-50",
                    !notification.read && "bg-indigo-50/60",
                  )}
                  disabled={marking}
                  key={notification.id}
                  onClick={() => onNotificationClick(notification)}
                  type="button"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "mt-1 size-2 shrink-0 rounded-full",
                      notification.read ? "bg-slate-300" : "bg-indigo-600",
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-medium text-slate-500">
                      {notificationTypeLabels[notification.type]}
                    </span>
                    <span className="block truncate font-semibold text-slate-900">
                      {displayTicketNumber(notification.ticketNumber)}{" "}
                      {notification.ticketTitle}
                    </span>
                    <span className="block truncate text-xs text-slate-500">
                      {notification.actor ? `${notification.actor} · ` : null}
                      {relativeTime(notification.createdAt)}
                    </span>
                  </span>
                </button>
              );
            })
          : null}
        {view === "recent" && recentTicketItems.length === 0 ? (
          <div className="px-3 py-4 text-slate-500">No recent tickets yet.</div>
        ) : null}
        {view === "recent"
          ? recentTicketItems.map((ticket) => (
              <button
                className="flex w-full gap-3 px-3 py-2 text-left hover:bg-slate-50"
                key={ticket.id}
                onClick={() => onRecentTicketClick(ticket)}
                type="button"
              >
                <span
                  aria-hidden="true"
                  className="mt-1 size-2 shrink-0 rounded-full bg-slate-300"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-slate-900">
                    {ticket.number} {ticket.title}
                  </span>
                  <span className="block truncate text-xs text-slate-500">
                    {ticket.customer} · {ticket.state} · {ticket.priority}
                  </span>
                </span>
              </button>
            ))
          : null}
      </div>
    </div>
  );
}
