"use client";

import { Forward, MessageSquarePlus, Reply, ReplyAll, RotateCcw, Send } from "lucide-react";
import { Button, Tooltip } from "@/components/ui";
import type { PostUpdateNavigation } from "./post-update-navigation";
import {
  PostUpdateNavigationSelector,
  usePostUpdateNavigationPreference,
} from "./post-update-navigation-selector";

export function TicketMetadataActionBar({
  canDiscard,
  canComment,
  canForward,
  canReply,
  canReplyAll,
  canUpdate,
  onDiscard,
  onComment,
  onForward,
  onReply,
  onUpdate,
  saving,
}: {
  canDiscard: boolean;
  canComment: boolean;
  canForward: boolean;
  canReply: boolean;
  canReplyAll: boolean;
  canUpdate: boolean;
  onDiscard(): void;
  onComment(): void;
  onForward(): void;
  onReply(intent: "reply" | "reply-all"): void;
  onUpdate(navigation: PostUpdateNavigation): void;
  saving: boolean;
}) {
  const [navigation, setNavigation] = usePostUpdateNavigationPreference();

  return (
    <section
      aria-label="Ticket actions"
      className="shrink-0 border-t border-slate-200 bg-white px-4 py-2"
      role="group"
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Button disabled={!canReply || saving} icon={<Reply aria-hidden="true" className="size-3.5" />} onClick={() => onReply("reply")} size="sm" type="button">
            Reply
          </Button>
          <Tooltip content={canReplyAll ? "Reply to every external recipient on the latest message." : "The latest replyable message has only one external recipient."} delayMs={150}>
            <Button disabled={!canReplyAll || saving} icon={<ReplyAll aria-hidden="true" className="size-3.5" />} onClick={() => onReply("reply-all")} size="sm" type="button">
              Reply all
            </Button>
          </Tooltip>
          <Button disabled={!canForward || saving} icon={<Forward aria-hidden="true" className="size-3.5" />} onClick={onForward} size="sm" type="button">
            Forward
          </Button>
          <Button disabled={!canComment || saving} icon={<MessageSquarePlus aria-hidden="true" className="size-3.5" />} onClick={onComment} size="sm" type="button">
            Comment
          </Button>
        </div>
        <div className="flex items-end gap-2">
          <Button
            className="!h-8 gap-1.5 !bg-slate-50 px-2 text-sm font-normal hover:!bg-slate-100"
            disabled={!canDiscard || saving}
            icon={<RotateCcw aria-hidden="true" className="size-3.5" />}
            onClick={onDiscard}
            type="button"
            variant="secondary"
          >
            Discard changes
          </Button>
          <PostUpdateNavigationSelector
            disabled={!canUpdate || saving}
            onValueChange={setNavigation}
            value={navigation}
          />
          <Button
            className="!h-8 gap-1.5 px-3 text-sm font-semibold"
            disabled={!canUpdate}
            icon={<Send aria-hidden="true" className="size-3.5" />}
            loading={saving}
            onClick={() => onUpdate(navigation)}
            type="button"
            variant="primary"
          >
            Update
          </Button>
        </div>
      </div>
    </section>
  );
}
