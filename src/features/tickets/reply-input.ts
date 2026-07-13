import { z } from "zod";
import type {
  TicketCustomerReplyInput,
  TicketReplyIntent,
} from "@/core/ticket-replies";
import type { TicketCommunicationBodyFormat } from "@/core/tickets";

const addressSchema = z.string().trim().toLowerCase().max(254).email();

export function normalizedReplyAddress(value: string): string | undefined {
  if (/[\r\n\0]/u.test(value)) {
    return undefined;
  }
  const parsed = addressSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

export function normalizedReplyRecipients(
  toValues: string[],
  ccValues: string[],
): { to: string[]; cc: string[] } | undefined {
  const seen = new Set<string>();
  const normalized = (values: string[]): string[] | undefined => {
    const result: string[] = [];
    for (const value of values) {
      const address = normalizedReplyAddress(value);
      if (!address) {
        return undefined;
      }
      if (!seen.has(address)) {
        seen.add(address);
        result.push(address);
      }
    }
    return result;
  };
  const to = normalized(toValues);
  const cc = normalized(ccValues);
  if (!to || !cc || to.length + cc.length === 0) {
    return undefined;
  }
  return { to, cc };
}

export function isTicketReplyIntent(value: string): value is TicketReplyIntent {
  return value === "reply" || value === "reply-all";
}

export function customerReplyInput(input: {
  body: string;
  bodyFormat: TicketCommunicationBodyFormat;
  cc: string[];
  contextVersion: string;
  intent: string;
  sourceArticleExternalId: string;
  to: string[];
}): TicketCustomerReplyInput | undefined {
  const recipients = normalizedReplyRecipients(input.to, input.cc);
  if (
    !input.body ||
    !input.contextVersion.trim() ||
    !input.sourceArticleExternalId.trim() ||
    !isTicketReplyIntent(input.intent) ||
    !recipients
  ) {
    return undefined;
  }
  return {
    body: input.body,
    bodyFormat: input.bodyFormat,
    cc: recipients.cc,
    contextVersion: input.contextVersion.trim(),
    intent: input.intent,
    sourceArticleExternalId: input.sourceArticleExternalId.trim(),
    to: recipients.to,
  };
}
