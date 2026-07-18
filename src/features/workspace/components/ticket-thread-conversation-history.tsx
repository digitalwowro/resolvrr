import type { WorkspaceArticle } from "@/features/tickets/workspace-adapter";
import type { TicketCommunicationDraft } from "./metadata-draft";
import { TicketConversationHistory } from "./ticket-conversation-history";

export function TicketThreadConversationHistory({
  articles,
  disabled,
  draft,
  onChange,
}: {
  articles: WorkspaceArticle[];
  disabled: boolean;
  draft: Exclude<TicketCommunicationDraft, { kind: "internal-comment" }>;
  onChange(draft: TicketCommunicationDraft): void;
}) {
  if (
    !draft.conversationHistoryContextVersion ||
    draft.conversationHistoryMessageCount === undefined ||
    !draft.conversationHistoryScope
  ) {
    return null;
  }
  return (
    <TicketConversationHistory
      articles={articles}
      context={{
        contextVersion: draft.conversationHistoryContextVersion,
        messageCount: draft.conversationHistoryMessageCount,
        scope: draft.conversationHistoryScope,
      }}
      disabled={disabled}
      included={draft.includeConversationHistory}
      onIncludedChange={(includeConversationHistory) =>
        onChange({ ...draft, includeConversationHistory })
      }
      sourceArticleExternalId={draft.sourceArticleExternalId}
    />
  );
}
