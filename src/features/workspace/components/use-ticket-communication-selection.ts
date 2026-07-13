"use client";

import { useState } from "react";
import type { TicketReplyIntent } from "@/core/ticket-replies";
import type { WorkspaceArticle } from "@/features/tickets/workspace-adapter";
import {
  communicationDraftNeedsReplacementConfirmation,
  type TicketCommunicationDraft,
} from "./metadata-draft";
import { replyDraftFromArticle } from "./communication-draft-factory";

const composerId = "ticket-communication-composer";

function sameSelection(
  current: TicketCommunicationDraft | undefined,
  next: TicketCommunicationDraft,
) {
  return current?.kind === next.kind && (
    current.kind === "internal-comment" || (
      next.kind === "customer-reply" &&
      current.intent === next.intent &&
      current.sourceArticleExternalId === next.sourceArticleExternalId
    )
  );
}

function focusComposer() {
  requestAnimationFrame(() => {
    const composer = document.getElementById(composerId);
    composer?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    composer?.querySelector<HTMLElement>("[contenteditable='true']")?.focus();
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
    requestReply: (article: WorkspaceArticle, intent: TicketReplyIntent) => {
      const next = replyDraftFromArticle(article, intent);
      if (next) request(next);
    },
  };
}
