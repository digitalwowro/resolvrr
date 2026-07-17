"use client";

import { useState } from "react";
import type { TicketReplyIntent } from "@/core/ticket-replies";
import type { WorkspaceArticle } from "@/features/tickets/workspace-adapter";
import {
  communicationDraftNeedsReplacementConfirmation,
  type TicketCommunicationDraft,
} from "./metadata-draft";
import {
  forwardDraftFromArticle,
  replyDraftFromArticle,
} from "./communication-draft-factory";

const composerId = "ticket-communication-composer";

function sameSelection(
  current: TicketCommunicationDraft | undefined,
  next: TicketCommunicationDraft,
) {
  return current?.kind === next.kind && (
    current.kind === "internal-comment" || (
      next.kind !== "internal-comment" &&
      current.kind === next.kind &&
      current.sourceArticleExternalId === next.sourceArticleExternalId &&
      (next.kind !== "customer-reply" || (
        current.kind === "customer-reply" && current.intent === next.intent
      ))
    )
  );
}

function focusComposer() {
  requestAnimationFrame(() => {
    const composer = document.getElementById(composerId);
    const scroller = composer?.closest<HTMLElement>(".ticket-detail-scroll");
    if (composer && scroller && typeof scroller.scrollTo === "function") {
      const composerRect = composer.getBoundingClientRect();
      const scrollerRect = scroller.getBoundingClientRect();
      scroller.scrollTo({
        behavior: "smooth",
        top: Math.max(
          0,
          scroller.scrollTop + composerRect.top - scrollerRect.top,
        ),
      });
    }
    composer
      ?.querySelector<HTMLElement>("[contenteditable='true']")
      ?.focus({ preventScroll: true });
  });
}

export function useTicketCommunicationSelection({
  draft,
  onChange,
}: {
  draft?: TicketCommunicationDraft;
  onChange(next?: TicketCommunicationDraft): void;
}) {
  const [pending, setPending] = useState<TicketCommunicationDraft>();

  function request(next: TicketCommunicationDraft) {
    if (sameSelection(draft, next)) {
      focusComposer();
      return;
    }
    if (communicationDraftNeedsReplacementConfirmation(draft)) {
      setPending(next);
      return;
    }
    onChange(next);
    focusComposer();
  }

  return {
    cancelReplacement: () => setPending(undefined),
    confirmReplacement: () => {
      if (!pending) return;
      onChange(pending);
      setPending(undefined);
      focusComposer();
    },
    pendingReplacement: pending,
    requestComment: () => request({ body: "", kind: "internal-comment" }),
    requestForward: (article: WorkspaceArticle) => {
      const next = forwardDraftFromArticle(article);
      if (next) request(next);
    },
    requestReply: (article: WorkspaceArticle, intent: TicketReplyIntent) => {
      const next = replyDraftFromArticle(article, intent);
      if (next) request(next);
    },
  };
}
