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
import { WorkspaceNotificationsPanel } from "./workspace-notifications-panel";
import { notificationTab } from "./workspace-notifications-utils";

const notificationRefreshMs = 120_000;

type WorkspaceNotificationsProps = {
  activeTicketId?: string;
  loadNotificationsAction: LoadWorkspaceNotificationsAction;
  markNotificationsReadAction: MarkWorkspaceNotificationsReadAction;
  onOpenTicket(tab: WorkspaceTicketTab): void;
  onRefreshTicket(ticketExternalId: string): void;
  recentTickets: WorkspaceTicketTab[];
  tone?: "dark" | "default";
};

export function WorkspaceNotifications({
  activeTicketId,
  loadNotificationsAction,
  markNotificationsReadAction,
  onOpenTicket,
  onRefreshTicket,
  recentTickets,
  tone = "default",
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
          className={cn(
            "relative inline-grid size-8 place-items-center rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
            tone === "dark"
              ? "text-indigo-100 hover:text-white focus-visible:outline-white"
              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus-visible:outline-indigo-600",
          )}
          onClick={() => setOpen((current) => !current)}
          onKeyDown={handleTriggerKeyDown}
          type="button"
        >
          <Bell aria-hidden="true" className="size-5" />
          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-white px-1 text-[10px] font-semibold leading-4 text-indigo-900">
              {unreadCount}
            </span>
          ) : null}
        </button>
      </Tooltip>
      {open ? (
        <WorkspaceNotificationsPanel
          activeNotifications={activeNotifications}
          loadStatus={loadStatus}
          markingIds={markingIds}
          notifications={notifications}
          onMarkAllRead={handleMarkAllRead}
          onNotificationClick={handleNotificationClick}
          onRecentTicketClick={handleRecentTicketClick}
          onViewChange={setView}
          recentTicketItems={recentTicketItems}
          unreadCount={unreadCount}
          unreadIds={unreadIds}
          view={view}
        />
      ) : null}
    </div>
  );
}
