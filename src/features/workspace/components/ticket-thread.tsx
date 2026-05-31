"use client";

import { useState } from "react";
import type {
  TicketCommunicationCapabilities,
  TicketCustomerReplyActionState,
  TicketCustomerReplyPayload,
  TicketInternalNoteActionState,
  TicketInternalNotePayload,
} from "@/features/tickets/communication-model";
import type { WorkspaceArticle } from "@/features/tickets/workspace-adapter";
import type { InlineCommunicationMode } from "./ticket-inline-communication-composer";
import { TicketThreadArticle } from "./ticket-thread-article";

type TicketThreadProps = {
  addTicketCustomerReplyAction(
    request: TicketCustomerReplyPayload,
  ): Promise<TicketCustomerReplyActionState>;
  addTicketInternalNoteAction(
    request: TicketInternalNotePayload,
  ): Promise<TicketInternalNoteActionState>;
  articles: WorkspaceArticle[];
  communicationCapabilities: TicketCommunicationCapabilities;
  onCommunicationSaved(ticketId: string): void;
  ticketExternalId: string;
};

type ActiveComposer = {
  articleId: string;
  mode: InlineCommunicationMode;
};

export function TicketThread({
  addTicketCustomerReplyAction,
  addTicketInternalNoteAction,
  articles,
  communicationCapabilities,
  onCommunicationSaved,
  ticketExternalId,
}: TicketThreadProps) {
  const [activeComposer, setActiveComposer] = useState<ActiveComposer | null>(null);

  return (
    <section className="px-4 py-4">
      <div className="space-y-3">
        {articles.map((article) => (
          <TicketThreadArticle
            activeMode={
              activeComposer?.articleId === article.id
                ? activeComposer.mode
                : null
            }
            addTicketCustomerReplyAction={addTicketCustomerReplyAction}
            addTicketInternalNoteAction={addTicketInternalNoteAction}
            article={article}
            communicationCapabilities={communicationCapabilities}
            key={article.id}
            onCancelComposer={() => setActiveComposer(null)}
            onOpenComposer={(mode) =>
              setActiveComposer({ articleId: article.id, mode })
            }
            onSaved={onCommunicationSaved}
            ticketExternalId={ticketExternalId}
          />
        ))}
        {articles.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
            No ticket thread is available.
          </div>
        ) : null}
      </div>
    </section>
  );
}
