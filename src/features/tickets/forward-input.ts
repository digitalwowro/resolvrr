import { z } from "zod";
import type { TicketCustomerForwardInput } from "@/core/ticket-forwards";
import type { TicketCommunicationBodyFormat } from "@/core/tickets";
import type { TicketSignatureSelection } from "@/core/ticket-signatures";
import { normalizedReplyRecipients } from "./reply-input";

const subjectSchema = z.string().trim().min(1).max(500).refine(
  (value) => !/[\r\n\0]/u.test(value),
);

export function customerForwardInput(input: {
  attachmentExternalIds: string[];
  body: string;
  bodyFormat: TicketCommunicationBodyFormat;
  cc: string[];
  contextVersion: string;
  includeOriginal: boolean;
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
  if (
    !subject.success || !contextVersion || !sourceArticleExternalId || !recipients ||
    attachmentExternalIds.some((id) => !/^\d+$/u.test(id))
  ) return undefined;
  return {
    attachmentExternalIds,
    body: input.body,
    bodyFormat: input.bodyFormat,
    cc: recipients.cc,
    contextVersion,
    includeOriginal: input.includeOriginal,
    sourceArticleExternalId,
    signatureContext: input.signatureContext,
    subject: subject.data,
    to: recipients.to,
  };
}
