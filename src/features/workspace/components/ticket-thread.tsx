"use client";

import {
  Bold,
  ChevronDown,
  CornerUpLeft,
  Italic,
  Link,
  List,
  ListOrdered,
  UsersRound,
  Send,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui";
import { cn } from "@/components/ui/classnames";
import type { StaticTicketReply } from "../static-types";

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
  icon,
  onClick,
}: {
  children: ReactNode;
  icon: ReactNode;
  onClick(): void;
}) {
  return (
    <button
      className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-semibold hover:bg-slate-100"
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
      <div className="border-b border-slate-200">
        <button
          aria-expanded={isExpanded}
          aria-label={`Message details for ${reply.authorName}`}
          className="flex w-full items-center gap-3 px-3 py-2 text-left"
          onClick={() => setIsExpanded((current) => !current)}
          type="button"
        >
          <div className="grid size-6 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-[10px] font-semibold">
            {initials(reply.authorName)}
          </div>
          <div className="flex min-w-0 flex-1 items-baseline gap-2">
            <span className="truncate text-xs font-semibold">
              {reply.authorName}
            </span>
            <span className="truncate text-xs">({reply.authorEmail})</span>
            <span className="shrink-0 text-xs">·</span>
            <time className="shrink-0 text-xs">{reply.createdAt}</time>
          </div>
          <ChevronDown
            aria-hidden="true"
            className={cn(
              "size-4 shrink-0 transition-transform",
              isExpanded ? "rotate-180" : "",
            )}
          />
        </button>
        {isExpanded ? (
          <div className="px-3 pb-2 pl-12">
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
      <div
        aria-label={`Message actions for ${reply.authorName}`}
        className={cn(
          "flex items-center gap-2 border-t bg-white/35 px-3 py-2",
          replyActionBorderClass[reply.type],
        )}
      >
        <ReplyActionButton
          icon={<CornerUpLeft aria-hidden="true" className="size-3.5" />}
          onClick={() => onReply(reply, "reply")}
        >
          Reply
        </ReplyActionButton>
        <ReplyActionButton
          icon={<UsersRound aria-hidden="true" className="size-3.5" />}
          onClick={() => onReply(reply, "reply-all")}
        >
          Reply all
        </ReplyActionButton>
      </div>
      {activeMode ? (
        <ReplyComposer onCancel={onCancelReply} replyType={reply.type} />
      ) : null}
    </article>
  );
}

function EditorButton({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <button
      aria-label={label}
      className="grid size-7 place-items-center rounded-md border border-slate-200 bg-white hover:bg-slate-50"
      type="button"
    >
      {children}
    </button>
  );
}

function ReplyComposer({
  onCancel,
  replyType,
}: {
  onCancel(): void;
  replyType: StaticTicketReply["type"];
}) {
  const [body, setBody] = useState("");

  return (
    <section
      aria-label="Reply composer"
      className={cn(
        "shrink-0 border-t px-4 py-3",
        replyTypeClass[replyType],
      )}
    >
      <div className="rounded-md border border-indigo-200 bg-white">
        <div
          aria-label="Reply body"
          className="min-h-24 px-3 py-2 outline-none empty:before:text-slate-400 empty:before:content-['Write_a_reply...']"
          contentEditable
          onInput={(event) => setBody(event.currentTarget.textContent ?? "")}
          role="textbox"
          suppressContentEditableWarning
        >
          {body}
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-2 py-2">
          <div className="flex items-center gap-1">
            <EditorButton label="Bold">
              <Bold aria-hidden="true" className="size-3.5" />
            </EditorButton>
            <EditorButton label="Italic">
              <Italic aria-hidden="true" className="size-3.5" />
            </EditorButton>
            <EditorButton label="Insert link">
              <Link aria-hidden="true" className="size-3.5" />
            </EditorButton>
            <EditorButton label="Bulleted list">
              <List aria-hidden="true" className="size-3.5" />
            </EditorButton>
            <EditorButton label="Numbered list">
              <ListOrdered aria-hidden="true" className="size-3.5" />
            </EditorButton>
          </div>
          <div className="flex items-center gap-2">
            <Button
              className="!h-7 !px-2 !text-xs"
              onClick={onCancel}
              type="button"
              variant="secondary"
            >
              Cancel
            </Button>
            <Button
              className="!h-7 !px-2 !text-xs"
              icon={<Send aria-hidden="true" className="size-3.5" />}
              onClick={() => undefined}
              type="button"
              variant="primary"
            >
              Send
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

export function TicketThread({ replies }: TicketThreadProps) {
  const [activeReply, setActiveReply] = useState<ActiveReply | null>(null);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        aria-label="Ticket replies"
        className="min-h-0 flex-1 space-y-3 overflow-auto px-4 py-4"
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
