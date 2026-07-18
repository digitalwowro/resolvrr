import { z } from "zod";
import type { TicketCustomerForwardInput } from "@/core/ticket-forwards";
import type { TicketCommunicationBodyFormat } from "@/core/tickets";
import type { TicketSignatureSelection } from "@/core/ticket-signatures";
import {
  isTicketConversationHistoryScope,
} from "@/core/ticket-conversation-history";
import { normalizedReplyRecipients } from "./reply-input";

const subjectSchema = z.string().trim().min(1).max(500).refine(
  (value) => !/[\r\n\0]/u.test(value),
);

export function customerForwardInput(input: {
  attachmentExternalIds: string[];
  body: string;
  bodyFormat: TicketCommunicationBodyFormat;
  cc: string[];
  conversationHistoryContextVersion?: string;
  conversationHistoryScope?: unknown;
  contextVersion: string;
  includeConversationHistory: boolean;
  sourceArticleExternalId: string;
  signatureContext?: TicketSignatureSelection;
  subject: string;
  to: string[];
}): TicketCustomerForwardInput | undefined {
  const contextVersion = input.contextVersion.trim();
  const sourceArticleExternalId = input.sourceArticleExternalId.trim();
  const subject = subjectSchema.safeParse(input.subject);
  const recipients = normalizedReplyRecipients(input.to, input.cc);
  const attachmentExternalIds = [...new Set(input.attachmentExternalIds.map((id) => id.trim()))];
  const conversationHistoryScope = isTicketConversationHistoryScope(
    input.conversationHistoryScope,
  )
    ? input.conversationHistoryScope
    : undefined;
  if (
    !subject.success || !contextVersion || !sourceArticleExternalId || !recipients ||
    (input.includeConversationHistory &&
      (
        !input.conversationHistoryContextVersion?.trim() ||
        !conversationHistoryScope
      )) ||
    attachmentExternalIds.some((id) => !/^\d+$/u.test(id))
  ) return undefined;
  return {
    attachmentExternalIds,
    body: input.body,
    bodyFormat: input.bodyFormat,
    cc: recipients.cc,
    ...(input.includeConversationHistory
      ? {
          conversationHistoryContextVersion:
            input.conversationHistoryContextVersion?.trim(),
          conversationHistoryScope,
        }
      : {}),
    contextVersion,
    includeConversationHistory: input.includeConversationHistory,
    sourceArticleExternalId,
    signatureContext: input.signatureContext,
    subject: subject.data,
    to: recipients.to,
  };
}
