import { createHash } from "node:crypto";
import type { TicketArticleForwardContext } from "@/core/ticket-forwards";
import type { ZammadArticle } from "./schemas";

function stableProviderValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableProviderValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, stableProviderValue(item)]),
    );
  }
  return value;
}

export function zammadForwardContext(
  article: ZammadArticle,
  fallbackSubject: string,
): TicketArticleForwardContext | undefined {
  if (article.internal || article.type?.toLowerCase() !== "email") {
    return undefined;
  }

  const subject = article.subject?.trim() || fallbackSubject.trim();
  if (!subject) return undefined;
  const attachments = article.attachments.map((attachment) => {
    const numericSize = Number(attachment.size);
    return {
      id: attachment.id,
      filename: attachment.filename,
      name: attachment.name,
      size: Number.isFinite(numericSize) ? numericSize : attachment.size,
      preferences: stableProviderValue(attachment.preferences),
    };
  });
  const contextVersion = createHash("sha256")
    .update(JSON.stringify({
      id: article.id,
      ticketId: article.ticket_id,
      type: article.type,
      sender: article.sender,
      internal: article.internal,
      subject,
      body: article.body,
      from: article.from,
      to: article.to,
      cc: article.cc,
      createdAt: article.created_at,
      attachments,
      updatedAt: article.updated_at,
    }))
    .digest("hex");

  return {
    channel: "email",
    contextVersion,
    sourceArticleExternalId: String(article.id),
    subject,
  };
}
