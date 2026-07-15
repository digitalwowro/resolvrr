import { getCurrentUser } from "@/auth/current-user";
import { env } from "@/config/env";
import { prismaHelpdeskConnectionsRepository } from "@/data/helpdesk-connections-repository";
import { loadWorkspaceTicketInlineImage } from "@/features/tickets/inline-image-service";
import { providerRegistry } from "@/providers";

type InlineImageRouteParams = {
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

export async function GET(
  _request: Request,
  context: { params: Promise<InlineImageRouteParams> },
): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) return unavailable(401);

  const params = await context.params;
  if (!Object.values(params).every(validPathValue)) return unavailable(404);
  const result = await loadWorkspaceTicketInlineImage({
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

  return new Response(Buffer.from(result.image.bytes), {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Length": String(result.image.bytes.byteLength),
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Content-Type": result.image.contentType,
      "Cross-Origin-Resource-Policy": "same-origin",
      "X-Content-Type-Options": "nosniff",
    },
    status: 200,
  });
}
