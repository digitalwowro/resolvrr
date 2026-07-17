import { getCurrentUser } from "@/auth/current-user";
import { env } from "@/config/env";
import { prismaHelpdeskConnectionsRepository } from "@/data/helpdesk-connections-repository";
import { loadWorkspaceTicketAttachment } from "@/features/tickets/attachment-service";
import { providerRegistry } from "@/providers";

type AttachmentRouteParams = {
  articleExternalId: string;
  attachmentExternalId: string;
  connectionId: string;
  ticketExternalId: string;
};

function unavailable(status: number): Response {
  return new Response(null, {
    headers: { "Cache-Control": "private, no-store" },
    status,
  });
}

function validPathValue(value: string): boolean {
  return value.length > 0 && value.length <= 128 && !/[\0\r\n]/u.test(value);
}

function rfc5987Value(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/gu, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function contentDisposition(fileName: string): string {
  const safeName = fileName.replace(/[\0\r\n]/gu, "").slice(0, 255) || "attachment";
  const fallback = safeName
    .replace(/[^\x20-\x7e]/gu, "_")
    .replace(/["\\]/gu, "_");
  return `attachment; filename="${fallback}"; filename*=UTF-8''${rfc5987Value(safeName)}`;
}

export async function GET(
  _request: Request,
  context: { params: Promise<AttachmentRouteParams> },
): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) return unavailable(401);

  const params = await context.params;
  if (!Object.values(params).every(validPathValue)) return unavailable(404);
  const result = await loadWorkspaceTicketAttachment({
    connectionId: params.connectionId,
    encryptionKey: env.APP_ENCRYPTION_KEY,
    locator: {
      articleExternalId: params.articleExternalId,
      attachmentExternalId: params.attachmentExternalId,
      ticketExternalId: params.ticketExternalId,
    },
    registry: providerRegistry,
    repository: prismaHelpdeskConnectionsRepository,
    userId: user.id,
  });

  if (result.status === "unavailable") {
    return unavailable(result.retryable ? 503 : 404);
  }

  return new Response(Buffer.from(result.attachment.bytes), {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": contentDisposition(result.attachment.fileName),
      "Content-Length": String(result.attachment.bytes.byteLength),
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Content-Type": result.attachment.contentType,
      "Cross-Origin-Resource-Policy": "same-origin",
      "X-Content-Type-Options": "nosniff",
      "X-Download-Options": "noopen",
    },
    status: 200,
  });
}
