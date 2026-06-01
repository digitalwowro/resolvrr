"use client";

import { ChevronDown, CornerUpLeft, UsersRound } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/components/ui/classnames";
import type { StaticTicketReply } from "../static-types";
import { TicketReplyComposer } from "./ticket-reply-composer";

type ReplyMode = "reply" | "reply-all";

type ActiveReply = {
  mode: ReplyMode;
  replyId: string;
};

type TicketThreadProps = {
  replies: StaticTicketReply[];
};

const replyTypeClass: Record<StaticTicketReply["type"], string> = {
  customer: "border-indigo-100 bg-indigo-50",
  employee: "border-slate-200 bg-slate-50/40",
  "internal-note": "border-amber-200 bg-amber-50",
};

const replyActionBorderClass: Record<StaticTicketReply["type"], string> = {
  customer: "border-indigo-100",
  employee: "border-slate-200",
  "internal-note": "border-amber-200",
};

const replyAvatarClass: Record<StaticTicketReply["type"], string> = {
  customer: "bg-indigo-600 text-white",
  employee: "bg-black text-white",
  "internal-note": "bg-amber-600 text-white",
};

const replyActionStateClass: Record<StaticTicketReply["type"], string> = {
  customer: "hover:bg-indigo-100 active:bg-indigo-200",
  employee: "hover:bg-slate-100 active:bg-slate-200",
  "internal-note": "hover:bg-amber-100 active:bg-amber-200",
};

const replyActionSelectedClass: Record<StaticTicketReply["type"], string> = {
  customer: "bg-indigo-200 hover:bg-indigo-200 active:bg-indigo-200",
  employee: "bg-slate-200 hover:bg-slate-200 active:bg-slate-200",
  "internal-note": "bg-amber-200 hover:bg-amber-200 active:bg-amber-200",
};

const replyTypeLabel: Record<StaticTicketReply["type"], string> = {
  customer: "Customer reply",
  employee: "Employee reply",
  "internal-note": "Internal note",
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function ContactLine({
  contacts,
  label,
}: {
  contacts: Array<{ name: string; email: string }>;
  label: string;
}) {
  return (
    <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-baseline gap-2">
      <span className="text-xs">{label}:</span>
      <div className="min-w-0 leading-tight">
        {contacts.map((contact) => (
          <span
            className="mr-2 inline-flex min-w-0 items-baseline gap-1"
            key={`${contact.name}-${contact.email}`}
          >
            <span className="truncate text-xs font-semibold">{contact.name}</span>
            <span className="truncate text-xs">({contact.email})</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function ReplyActionButton({
  children,
  isSelected,
  icon,
  onClick,
  replyType,
}: {
  children: ReactNode;
  isSelected: boolean;
  icon: ReactNode;
  onClick(): void;
  replyType: StaticTicketReply["type"];
}) {
  return (
    <button
      className={cn(
        "inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-semibold",
        isSelected
          ? replyActionSelectedClass[replyType]
          : cn("bg-transparent", replyActionStateClass[replyType]),
      )}
      onClick={onClick}
      type="button"
    >
      {icon}
      {children}
    </button>
  );
}

function ReplyCard({
  activeMode,
  onCancelReply,
  onReply,
  reply,
}: {
  activeMode: ReplyMode | null;
  onCancelReply(): void;
  onReply(reply: StaticTicketReply, mode: ReplyMode): void;
  reply: StaticTicketReply;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <article
      aria-label={`${replyTypeLabel[reply.type]} from ${reply.authorName}`}
      className={cn(
        "overflow-hidden rounded-md border",
        replyTypeClass[reply.type],
      )}
    >
      <div>
        <button
          aria-expanded={isExpanded}
          aria-label={`Message details for ${reply.authorName}`}
          className="flex w-full items-center gap-3 px-3 pt-3 text-left"
          onClick={() => setIsExpanded((current) => !current)}
          type="button"
        >
          <div
            className={cn(
              "grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-semibold",
              replyAvatarClass[reply.type],
            )}
          >
            {initials(reply.authorName)}
          </div>
          <div className="flex min-w-0 flex-1 items-baseline gap-2">
            <span className="truncate text-xs font-semibold">
              {reply.authorName}
            </span>
            <span className="truncate text-xs">&lt;{reply.authorEmail}&gt;</span>
            <span className="shrink-0 text-xs">·</span>
            <time className="shrink-0 text-xs">{reply.createdAt}</time>
            <ChevronDown
              aria-hidden="true"
              className={cn(
                "size-4 shrink-0 self-center transition-transform",
                isExpanded ? "rotate-180" : "",
              )}
            />
          </div>
        </button>
        {isExpanded ? (
          <div className="px-3 pt-1 pl-12">
            <div className="min-w-0 leading-tight">
              <ContactLine
                contacts={[
                  { name: reply.authorName, email: reply.authorEmail },
                ]}
                label="From"
              />
              <ContactLine contacts={reply.recipients} label="To" />
            </div>
          </div>
        ) : null}
      </div>
      <div className="px-3 py-3">
        <p className="text-black">{reply.body}</p>
      </div>
      {reply.type === "internal-note" ? null : (
        <div
          aria-label={`Message actions for ${reply.authorName}`}
          className={cn(
            "flex items-center gap-2 border-t bg-white/35 px-3 py-2",
            replyActionBorderClass[reply.type],
          )}
        >
          <ReplyActionButton
            isSelected={activeMode === "reply"}
            icon={<CornerUpLeft aria-hidden="true" className="size-3.5" />}
            onClick={() => onReply(reply, "reply")}
            replyType={reply.type}
          >
            Reply
          </ReplyActionButton>
          <ReplyActionButton
            isSelected={activeMode === "reply-all"}
            icon={<UsersRound aria-hidden="true" className="size-3.5" />}
            onClick={() => onReply(reply, "reply-all")}
            replyType={reply.type}
          >
            Reply all
          </ReplyActionButton>
        </div>
      )}
      {activeMode ? (
        <TicketReplyComposer
          className={replyTypeClass[reply.type]}
          onCancel={onCancelReply}
        />
      ) : null}
    </article>
  );
}

export function TicketThread({ replies }: TicketThreadProps) {
  const [activeReply, setActiveReply] = useState<ActiveReply | null>(null);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        aria-label="Ticket replies"
        className="min-h-0 flex-1 space-y-4 overflow-auto px-4 py-4"
      >
        {replies.map((reply) => (
          <ReplyCard
            activeMode={
              activeReply?.replyId === reply.id ? activeReply.mode : null
            }
            key={reply.id}
            onCancelReply={() => setActiveReply(null)}
            onReply={(selectedReply, mode) =>
              setActiveReply({ mode, replyId: selectedReply.id })
            }
            reply={reply}
          />
        ))}
      </div>
    </div>
  );
}
