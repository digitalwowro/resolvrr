import { vi } from "vitest";
import { safeProviderBytes, safeProviderJson } from "@/security/provider-http";
import {
  zammadReplyConversationHistoryContext,
} from "@/providers/zammad/reply-conversation-history";

export const mockedJson = vi.mocked(safeProviderJson);
export const mockedBytes = vi.mocked(safeProviderBytes);
export const ticket = {
  id: 42,
  number: "61061",
  title: "System notification",
  customer_id: 10,
  updated_at: "2026-07-14T08:30:00Z",
};

export function article(overrides: Record<string, unknown> = {}) {
  return {
    id: 500,
    ticket_id: 42,
    type: "email",
    sender: "Agent",
    internal: false,
    from: "System <support@example.com>",
    to: "Archive <archive@example.com>",
    cc: null,
    subject: "System notification",
    message_id: "source@example.com",
    body: '<div style="color:#125599"><strong>Hello</strong></div><script>bad()</script>',
    created_at: "2026-07-14T08:31:00Z",
    updated_at: "2026-07-14T08:31:00Z",
    attachments: [],
    ...overrides,
  };
}

export function arrange(source = article()) {
  mockedJson
    .mockResolvedValueOnce({ status: 200, headers: new Headers(), data: ticket })
    .mockResolvedValueOnce({ status: 200, headers: new Headers(), data: source });
}

export function arrangeHistory(history: ReturnType<typeof article>[]) {
  mockedJson.mockResolvedValueOnce({
    status: 200,
    headers: new Headers(),
    data: history,
  });
}

export function historyFields(source: ReturnType<typeof article>) {
  const context = zammadReplyConversationHistoryContext(
    [source],
    "through-source",
    source.id,
  );
  if (!context) throw new Error("Expected conversation history context");
  return {
    conversationHistoryContextVersion: context.contextVersion,
    conversationHistoryScope: context.scope,
  };
}
