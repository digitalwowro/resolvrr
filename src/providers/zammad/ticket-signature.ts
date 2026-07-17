import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { ProviderError, type ProviderContext } from "@/core/providers";
import type {
  ProviderTicketSignature,
  ProviderTicketSignatureRequest,
} from "@/core/ticket-signatures";
import { sanitizeProviderHtml } from "@/security/sanitize-html";
import {
  zammadBaseUrl,
  zammadGetBinary,
  zammadGetJson,
  zammadPostJsonRead,
} from "./client";
import { relationId } from "./participants";
import { zammadTicketPayload } from "./ticket-mutation-preflight";
import { zammadTicketId } from "./ticket-id";

const signatureResponseSchema = z.object({
  data: z.object({
    formUpdater: z.object({
      fields: z.record(z.string(), z.unknown()),
    }),
  }).optional(),
  errors: z.array(z.unknown()).optional(),
}).passthrough();

const signatureFieldSchema = z.object({
  signature: z.object({
    internalId: z.union([z.number(), z.string()]),
    renderedBody: z.string(),
  }).nullable().optional(),
}).passthrough();

const legacySignatureResponseSchema = z.object({
  data: z.object({
    ticketSignature: z.object({
      id: z.string().min(1),
      renderedBody: z.string(),
    }).nullable(),
  }).optional(),
  errors: z.array(z.unknown()).optional(),
}).passthrough();

const formUpdaterQuery = `query formUpdater($formUpdaterId: EnumFormUpdaterId!, $meta: FormUpdaterMetaInput!, $data: JSON!, $relationFields: [FormUpdaterRelationField!]!, $id: ID) { formUpdater(formUpdaterId: $formUpdaterId, meta: $meta, data: $data, relationFields: $relationFields, id: $id) { fields flags } }`;
const legacySignatureQuery = `query ticketSignature($groupId: ID!, $ticketId: ID) { ticketSignature(groupId: $groupId) { id renderedBody(ticketId: $ticketId) } }`;
const imageMarkerOrigin = "https://signature-image.invalid";
const maxSignatureImages = 12;
const maxSignatureImageBytes = 512 * 1024;
const inlineImagePattern = /^data:(image\/(?:gif|jpeg|png|webp));base64,([A-Za-z0-9+/]*={0,2})$/u;

function contextVersion(groupId: number | undefined, id: string, html = "") {
  return createHash("sha256")
    .update(`${groupId ?? "none"}\0${id}\0${html}`)
    .digest("base64url");
}

function attachmentId(source: string, baseUrl: string): string | undefined {
  try {
    const url = new URL(source, baseUrl);
    if (url.origin !== new URL(baseUrl).origin) return undefined;
    return url.pathname.match(/^\/api\/v1\/attachments\/(\d+)$/u)?.[1];
  } catch {
    return undefined;
  }
}

function boundedInlineImage(source: string): string | undefined {
  const match = inlineImagePattern.exec(source);
  if (!match) return undefined;
  const encoded = match[2]!;
  if (encoded.length % 4 !== 0) return undefined;
  const padding = encoded.endsWith("==") ? 2 : encoded.endsWith("=") ? 1 : 0;
  const decodedBytes = (encoded.length / 4) * 3 - padding;
  return decodedBytes <= maxSignatureImageBytes ? source : undefined;
}

async function inlineSignatureImages(
  context: ProviderContext,
  renderedBody: string,
) {
  const baseUrl = zammadBaseUrl(context);
  const ids = new Set<string>();
  let imageCount = 0;
  const marked = sanitizeProviderHtml(renderedBody, {
    rewriteImageSource(source) {
      if (source.startsWith("data:")) {
        const inline = boundedInlineImage(source);
        if (!inline || imageCount >= maxSignatureImages) return undefined;
        imageCount += 1;
        return inline;
      }
      const id = attachmentId(source, baseUrl);
      if (!id || imageCount >= maxSignatureImages) return undefined;
      imageCount += 1;
      ids.add(id);
      return `${imageMarkerOrigin}/${id}`;
    },
  });
  let html = marked;
  await Promise.all([...ids].map(async (id) => {
    const response = await zammadGetBinary(
      context,
      `/api/v1/attachments/${id}`,
      maxSignatureImageBytes,
      "signature-image-too-large",
    );
    const contentType = response.headers.get("content-type")?.split(";")[0]?.trim();
    if (!contentType?.match(/^image\/(?:gif|jpeg|png|webp)$/u)) {
      throw new ProviderError(
        "provider-data-mismatch",
        "The helpdesk signature contained an unsupported image.",
        false,
        undefined,
        "signature-image-invalid",
      );
    }
    const dataUrl = `data:${contentType};base64,${Buffer.from(response.data).toString("base64")}`;
    html = html.replaceAll(`${imageMarkerOrigin}/${id}`, dataUrl);
  }));
  return html;
}

function unavailableSignature(): ProviderError {
  return new ProviderError(
    "provider-data-mismatch",
    "The helpdesk signature could not be resolved.",
    false,
    undefined,
    "signature-context-unavailable",
  );
}

async function legacyTicketSignature(
  context: ProviderContext,
  groupId: number,
  ticketId: number,
) {
  const raw = await zammadPostJsonRead(context, "/graphql", {
    query: legacySignatureQuery,
    variables: {
      groupId: `gid://zammad/Group/${groupId}`,
      ticketId: `gid://zammad/Ticket/${ticketId}`,
    },
  });
  const response = legacySignatureResponseSchema.safeParse(raw);
  if (!response.success || response.data.errors?.length || !response.data.data) {
    throw unavailableSignature();
  }
  const signature = response.data.data.ticketSignature;
  return signature
    ? { id: signature.id, renderedBody: signature.renderedBody }
    : undefined;
}

export async function resolveZammadTicketSignature(
  context: ProviderContext,
  input: ProviderTicketSignatureRequest,
): Promise<ProviderTicketSignature> {
  const ticketId = zammadTicketId(input.ticketExternalId);
  let groupId = input.groupExternalId
    ? zammadTicketId(input.groupExternalId)
    : undefined;
  if (!groupId) {
    const payload = zammadTicketPayload(await zammadGetJson(
      context,
      `/api/v1/tickets/${ticketId}?expand=true&full=true`,
    ));
    const value = relationId(payload.ticket.group_id);
    groupId = value ? zammadTicketId(value) : undefined;
  }
  const raw = await zammadPostJsonRead(context, "/graphql", {
    query: formUpdaterQuery,
    variables: {
      data: {
        ...(groupId ? { group_id: groupId } : {}),
        article: { articleType: "email" },
      },
      formUpdaterId: "FormUpdater__Updater__Ticket__Edit",
      id: `gid://zammad/Ticket/${ticketId}`,
      meta: { formId: randomUUID(), initial: true },
      relationFields: [],
    },
  });
  const response = signatureResponseSchema.safeParse(raw);
  if (!response.success || response.data.errors?.length || !response.data.data) {
    throw unavailableSignature();
  }
  const fields = response.data.data.formUpdater.fields;
  let signature: { id: string; renderedBody: string } | undefined;
  if (Object.hasOwn(fields, "body")) {
    const body = signatureFieldSchema.safeParse(fields.body);
    if (!body.success) throw unavailableSignature();
    const modernSignature = body.data.signature;
    signature = modernSignature ? {
      id: String(modernSignature.internalId),
      renderedBody: modernSignature.renderedBody,
    } : undefined;
  } else if (groupId) {
    signature = await legacyTicketSignature(context, groupId, ticketId);
  }
  if (!signature) {
    return { contextVersion: contextVersion(groupId, "none") };
  }
  const renderedHtml = await inlineSignatureImages(context, signature.renderedBody);
  return {
    contextVersion: contextVersion(groupId, signature.id, renderedHtml),
    renderedHtml,
  };
}
