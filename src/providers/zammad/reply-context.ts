import { createHash } from "node:crypto";
import type { TicketArticleReplyContext, TicketReplyRecipients } from "@/core/ticket-replies";
import type { TicketArticle, TicketParticipant } from "@/core/tickets";
import type { ZammadArticle } from "./schemas";
import {
  normalizedManagedAddresses,
  parseZammadAddressList,
  uniqueReplyRecipients,
  type ParsedReplyAddress,
} from "./reply-addresses";

function filtered(
  value: string | string[] | null | undefined,
  managed: Set<string>,
): ParsedReplyAddress[] {
  return parseZammadAddressList(value).filter(
    (address) => !managed.has(address.email),
  );
}

function authorFallback(author: TicketParticipant): ParsedReplyAddress[] {
  const email = author.email?.trim().toLowerCase();
  return email ? [{ email, name: author.name }] : [];
}

function customerFallback(customer: TicketParticipant | undefined) {
  const email = customer?.email?.trim().toLowerCase();
  return email ? [{ email, name: customer?.name }] : [];
}

function contextVersion(article: ZammadArticle, managed: string[]): string {
  return createHash("sha256")
    .update(JSON.stringify({
      id: article.id,
      ticketId: article.ticket_id,
      type: article.type,
      sender: article.sender,
      internal: article.internal,
      from: article.from,
      to: article.to,
      cc: article.cc,
      replyTo: article.reply_to,
      messageId: article.message_id,
      managed,
    }))
    .digest("hex");
}

function replyRecipients(
  article: ZammadArticle,
  mapped: TicketArticle,
  customer: TicketParticipant | undefined,
  managed: Set<string>,
): TicketReplyRecipients {
  const sender = article.sender?.toLowerCase() ?? "";
  const type = article.type?.toLowerCase() ?? "";
  const from = filtered(article.from, managed);
  const to = filtered(article.to, managed);
  const replyTo = filtered(article.reply_to, managed);

  if (type === "phone") {
    const primary = sender.includes("agent") ? to : from;
    return uniqueReplyRecipients(
      primary.length > 0 ? primary : customerFallback(customer),
      [],
    );
  }

  const rawFrom = parseZammadAddressList(article.from);
  const senderIsSystem = rawFrom.some((address) => managed.has(address.email));
  const recipientIsSystem = parseZammadAddressList(article.to).some((address) =>
    managed.has(address.email),
  );
  const authorEmail = mapped.author.email?.toLowerCase();
  const agentSentDirectly = Boolean(
    !recipientIsSystem &&
      sender.includes("agent") &&
      authorEmail &&
      rawFrom.some((address) => address.email === authorEmail),
  );

  let primary: ParsedReplyAddress[];
  if (senderIsSystem) {
    primary = replyTo.length > 0 ? replyTo : to;
  } else if (agentSentDirectly) {
    primary = to;
  } else {
    primary = replyTo.length > 0 ? replyTo : from;
    if (primary.length === 0) {
      primary = authorFallback(mapped.author);
    }
  }
  if (primary.length === 0 && type === "web") {
    primary = customerFallback(customer);
  }

  return uniqueReplyRecipients(primary, []);
}

function replyAllRecipients(
  article: ZammadArticle,
  base: TicketReplyRecipients,
  managed: Set<string>,
): TicketReplyRecipients {
  const from = filtered(article.from, managed);
  const to = filtered(article.to, managed);
  const cc = filtered(article.cc, managed);
  const baseTo = base.to.map(({ email, name }) => ({ email, name }));
  return uniqueReplyRecipients([...baseTo, ...from, ...to], cc);
}

function replyAllAvailable(article: ZammadArticle, managed: Set<string>): boolean {
  const addresses = [
    ...filtered(article.to, managed),
    ...filtered(article.cc, managed),
    ...(article.sender?.toLowerCase().includes("customer")
      ? filtered(article.from, managed)
      : []),
  ];
  return new Set(addresses.map((address) => address.email)).size > 1;
}

export function zammadReplyContext(input: {
  article: ZammadArticle;
  customer?: TicketParticipant;
  managedAddresses: string[];
  mappedArticle: TicketArticle;
}): TicketArticleReplyContext | undefined {
  const { article, customer, mappedArticle } = input;
  if (article.internal) {
    return undefined;
  }
  const type = article.type?.toLowerCase();
  const sender = article.sender?.toLowerCase() ?? "";
  const channel = type === "email" || type === "web" || type === "phone"
    ? type
    : undefined;
  if (!channel || (channel === "phone" && !/(agent|customer)/u.test(sender))) {
    return undefined;
  }

  const managedAddresses = normalizedManagedAddresses(input.managedAddresses);
  const managed = new Set(managedAddresses);
  const reply = replyRecipients(article, mappedArticle, customer, managed);
  if (reply.to.length + reply.cc.length === 0) {
    return undefined;
  }

  const availableIntents: Array<"reply" | "reply-all"> = ["reply"];
  let replyAll: TicketReplyRecipients | undefined;
  if (channel === "email") {
    const candidate = replyAllRecipients(article, reply, managed);
    if (replyAllAvailable(article, managed)) {
      replyAll = candidate;
      availableIntents.push("reply-all");
    }
  }

  return {
    availableIntents,
    channel,
    contextVersion: contextVersion(article, managedAddresses),
    defaults: { reply, ...(replyAll ? { replyAll } : {}) },
    sourceArticleExternalId: String(article.id),
  };
}
