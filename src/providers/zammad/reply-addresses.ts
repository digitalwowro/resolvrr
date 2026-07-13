import * as emailAddresses from "email-addresses";
import { z } from "zod";
import type { TicketReplyRecipient } from "@/core/ticket-replies";

const emailSchema = z.string().trim().toLowerCase().max(254).email();

export type ParsedReplyAddress = {
  email: string;
  name?: string;
};

function mailboxes(
  values: Array<emailAddresses.ParsedMailbox | emailAddresses.ParsedGroup>,
): emailAddresses.ParsedMailbox[] {
  return values.flatMap((value) =>
    value.type === "mailbox" ? [value] : value.addresses,
  );
}

export function parseZammadAddressList(
  value: string | string[] | null | undefined,
): ParsedReplyAddress[] {
  const inputs = Array.isArray(value) ? value : value ? [value] : [];
  const parsed = inputs.flatMap((input) => {
    if (/[\r\n\0]/u.test(input)) {
      return [];
    }
    try {
      return mailboxes(
        emailAddresses.parseAddressList({
          input,
          rfc6532: true,
          strict: false,
        }) ?? [],
      );
    } catch {
      return [];
    }
  });

  return parsed.flatMap((address) => {
    const email = emailSchema.safeParse(address.address);
    if (!email.success) {
      return [];
    }
    const name = address.name?.trim().replace(/[\r\n\0]/gu, "");
    return [{ email: email.data, ...(name ? { name } : {}) }];
  });
}

export function uniqueReplyRecipients(
  to: ParsedReplyAddress[],
  cc: ParsedReplyAddress[],
): { to: TicketReplyRecipient[]; cc: TicketReplyRecipient[] } {
  const seen = new Set<string>();
  const unique = (
    addresses: ParsedReplyAddress[],
    channel: "to" | "cc",
  ): TicketReplyRecipient[] =>
    addresses.flatMap((address) => {
      if (seen.has(address.email)) {
        return [];
      }
      seen.add(address.email);
      return [{ ...address, channel }];
    });

  return { to: unique(to, "to"), cc: unique(cc, "cc") };
}

export function normalizedManagedAddresses(addresses: string[]): string[] {
  return [...new Set(addresses.flatMap((value) => {
    const parsed = emailSchema.safeParse(value);
    return parsed.success ? [parsed.data] : [];
  }))].sort();
}
