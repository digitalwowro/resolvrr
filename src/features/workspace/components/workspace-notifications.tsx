"use client";

import { Bell } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Tooltip } from "@/components/ui";
import { cn } from "@/components/ui/classnames";
import { useOutsideClick } from "@/components/ui/use-outside-click";
import type {
  LoadWorkspaceNotificationsAction,
  MarkWorkspaceNotificationsReadAction,
  WorkspaceNotification,
} from "@/features/notifications";
import type { WorkspaceTicketTab } from "@/features/tickets/workspace-adapter";

const notificationRefreshMs = 120_000;

type WorkspaceNotificationsProps = {
  activeTicketId?: string;
  loadNotificationsAction: LoadWorkspaceNotificationsAction;
  markNotificationsReadAction: MarkWorkspaceNotificationsReadAction;
  onOpenTicket(tab: WorkspaceTicketTab): void;
  onRefreshTicket(ticketExternalId: string): void;
  recentTickets: WorkspaceTicketTab[];
};

const notificationTypeLabels: Record<WorkspaceNotification["type"], string> = {
  "ticket-created": "New ticket",
  "ticket-updated": "Ticket updated",
  "ticket-reminder": "Reminder reached",
  "ticket-closed": "Ticket closed",
  "ticket-notification": "Ticket notification",
};

function displayTicketNumber(number: string): string {
  return number.startsWith("#") ? number : `#${number}`;
}

function notificationTab(notification: WorkspaceNotification): WorkspaceTicketTab {
  return {
    id: notification.ticketExternalId,
    number: displayTicketNumber(notification.ticketNumber),
    title: notification.ticketTitle,
    customer: "Unknown",
    owner: "Unknown",
    group: "Unknown",
    state: "Unknown",
    priority: "Unknown",
  };
}

function relativeTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }

  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const absolute = Math.abs(seconds);
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  if (absolute < 60) {
    return formatter.format(seconds, "second");
  }
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) {
    return formatter.format(minutes, "minute");
  }
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) {
    return formatter.format(hours, "hour");
  }
  const days = Math.round(hours / 24);
  return formatter.format(days, "day");
}

export function WorkspaceNotifications({
  activeTicketId,
  loadNotificationsAction,
  markNotificationsReadAction,
  onOpenTicket,
  onRefreshTicket,
  recentTickets,
}: WorkspaceNotificationsProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const activeHandledRef = useRef(new Set<string>());
  const lastRefreshAtRef = useRef(0);
  const notificationCountRef = useRef(0);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"active" | "recent">("active");
  const [notifications, setNotifications] = useState<WorkspaceNotification[]>([]);
  const [loadStatus, setLoadStatus] = useState<"idle" | "loading" | "failed">(
    "idle",
  );
  const [markingIds, setMarkingIds] = useState<Set<string>>(() => new Set());
  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications],
  );
  const unreadIds = useMemo(
    () =>
      notifications
        .filter((notification) => !notification.read)
        .map((notification) => notification.id),
    [notifications],
  );
  const activeNotifications = useMemo(
    () => notifications.filter((notification) => !notification.read),
    [notifications],
  );
  const recentTicketItems = useMemo(() => recentTickets.slice(0, 10), [
    recentTickets,
  ]);

  useOutsideClick(rootRef, () => setOpen(false), open);

  useEffect(() => {
    notificationCountRef.current = notifications.length;
  }, [notifications.length]);

  const refreshNotifications = useCallback(async () => {
    if (document.hidden) {
      return;
    }

    setLoadStatus((current) =>
      notificationCountRef.current === 0 && current !== "failed"
        ? "loading"
        : current,
    );
    const result = await loadNotificationsAction();
    lastRefreshAtRef.current = Date.now();
    if (result.status === "available") {
      setNotifications(result.notifications);
      setLoadStatus("idle");
      return;
    }
    setLoadStatus("failed");
  }, [loadNotificationsAction]);

  useEffect(() => {
    void refreshNotifications();

    function refreshIfVisibleAndStale() {
      if (
        document.hidden ||
        Date.now() - lastRefreshAtRef.current < notificationRefreshMs
      ) {
        return;
      }

      void refreshNotifications();
    }

    const intervalId = window.setInterval(() => {
      if (!document.hidden) {
        void refreshNotifications();
      }
    }, notificationRefreshMs);
    document.addEventListener("visibilitychange", refreshIfVisibleAndStale);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", refreshIfVisibleAndStale);
    };
  }, [refreshNotifications]);

  const markRead = useCallback(
    async (notificationIds: string[]) => {
      const ids = [
        ...new Set(notificationIds.map((id) => id.trim()).filter(Boolean)),
      ];
      if (ids.length === 0) {
        return;
      }

      setNotifications((current) =>
        current.map((notification) =>
          ids.includes(notification.id)
            ? { ...notification, read: true }
            : notification,
        ),
      );
      setMarkingIds((current) => new Set([...current, ...ids]));
      const result = await markNotificationsReadAction({ notificationIds: ids });
      if (result.status !== "saved") {
        void refreshNotifications();
      }
      setMarkingIds((current) => {
        const next = new Set(current);
        ids.forEach((id) => next.delete(id));
        return next;
      });
    },
    [markNotificationsReadAction, refreshNotifications],
  );

  useEffect(() => {
    if (!activeTicketId) {
      return;
    }

    const activeUnread = notifications.filter(
      (notification) =>
        !notification.read &&
        notification.ticketExternalId === activeTicketId &&
        !activeHandledRef.current.has(notification.id),
    );
    if (activeUnread.length === 0) {
      return;
    }

    const ids = activeUnread.map((notification) => notification.id);
    ids.forEach((id) => activeHandledRef.current.add(id));
    setNotifications((current) =>
      current.map((notification) =>
        ids.includes(notification.id)
          ? { ...notification, read: true }
          : notification,
      ),
    );
    onRefreshTicket(activeTicketId);
    void markRead(ids);
  }, [activeTicketId, markRead, notifications, onRefreshTicket]);

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Escape") {
      setOpen(false);
    }
  }

  function handleNotificationClick(notification: WorkspaceNotification) {
    onOpenTicket(notificationTab(notification));
    onRefreshTicket(notification.ticketExternalId);
    if (!notification.read) {
      void markRead([notification.id]);
    }
    setOpen(false);
  }

  function handleMarkAllRead() {
    void markRead(unreadIds);
  }

  function handleRecentTicketClick(ticket: WorkspaceTicketTab) {
    onOpenTicket(ticket);
    onRefreshTicket(ticket.id);
    setOpen(false);
  }

  const triggerLabel =
    unreadCount > 0
      ? `Notifications, ${unreadCount} unread`
      : "Notifications";

  return (
    <div className="relative inline-flex" ref={rootRef}>
      <Tooltip content={triggerLabel} side="bottom">
        <button
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-label={triggerLabel}
          className="relative inline-grid size-8 place-items-center rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          onClick={() => setOpen((current) => !current)}
          onKeyDown={handleTriggerKeyDown}
          type="button"
        >
          <Bell aria-hidden="true" className="size-4" />
          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-indigo-600 px-1 text-[10px] font-semibold leading-4 text-white">
              {unreadCount}
            </span>
          ) : null}
        </button>
      </Tooltip>
      {open ? (
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
                onClick={() => setView("active")}
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
                onClick={() => setView("recent")}
                type="button"
              >
                Recent
              </button>
              {view === "active" ? (
                <button
                  className="rounded-md px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-slate-100 disabled:text-slate-400"
                  disabled={unreadIds.length === 0 || markingIds.size > 0}
                  onClick={handleMarkAllRead}
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
            {view === "active" && loadStatus === "failed" && notifications.length === 0 ? (
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
            {view === "active" ? activeNotifications.map((notification) => {
              const marking = markingIds.has(notification.id);
              return (
                <button
                  className={cn(
                    "flex w-full gap-3 px-3 py-2 text-left hover:bg-slate-50",
                    !notification.read && "bg-indigo-50/60",
                  )}
                  disabled={marking}
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
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
            }) : null}
            {view === "recent" && recentTicketItems.length === 0 ? (
              <div className="px-3 py-4 text-slate-500">No recent tickets yet.</div>
            ) : null}
            {view === "recent"
              ? recentTicketItems.map((ticket) => (
                  <button
                    className="flex w-full gap-3 px-3 py-2 text-left hover:bg-slate-50"
                    key={ticket.id}
                    onClick={() => handleRecentTicketClick(ticket)}
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
      ) : null}
    </div>
  );
}
