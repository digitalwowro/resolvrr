import { randomUUID } from "node:crypto";
import { ProviderError } from "@/core/providers";
import type {
  ResolvedTicketSignature,
  TicketSignatureSelection,
  TicketSignatureSource,
} from "@/core/ticket-signatures";
import { decryptSecret, encryptSecret } from "@/security/encryption";
import { sanitizeSignatureTemplateHtml } from "@/security/sanitize-html";
import type { TicketProviderContext } from "@/features/tickets/connection-context";
import { dispatchTicketDetailRead } from "@/features/tickets/provider-dispatch";
import { communicationBodyHasText } from "@/features/tickets/communication-body";
import type {
  StoredWorkspaceSignatureTemplate,
  WorkspaceSignatureRepository,
} from "./repository";
import { renderWorkspaceSignatureTemplate, signatureContextVersion } from "./render";

export function validTicketSignatureSource(value: unknown): value is TicketSignatureSource {
  return value === "none" || value === "zammad" || value === "resolvrr";
}

function selectedTemplate(
  templates: StoredWorkspaceSignatureTemplate[],
  groupExternalId?: string,
) {
  return templates.find((template) => template.groupExternalId === groupExternalId) ??
    templates.find((template) => !template.groupExternalId);
}

export async function resolveWorkspaceTicketSignature(input: {
  encryptionKey: string;
  groupExternalId?: string;
  providerContext: TicketProviderContext;
  repository: WorkspaceSignatureRepository;
  ticketExternalId: string;
  userId: string;
}): Promise<ResolvedTicketSignature> {
  const workspaceId = input.providerContext.context.connection.workspaceId;
  const configuration = await input.repository.getConfiguration(workspaceId);
  if (!configuration) {
    throw new ProviderError("validation-failure", "Workspace signature settings are unavailable.", false, undefined, "signature-context-unavailable");
  }
  if (configuration.source === "none") {
    return {
      contextVersion: signatureContextVersion("none", configuration.contextVersion),
      source: "none",
    };
  }
  if (configuration.source === "zammad") {
    const resolver = input.providerContext.plugin.resolveTicketSignature;
    if (!resolver) {
      throw new ProviderError("unsupported-capability", "The helpdesk cannot resolve signatures.", false, undefined, "signature-context-unavailable");
    }
    const signature = await resolver(input.providerContext.context, {
      groupExternalId: input.groupExternalId,
      ticketExternalId: input.ticketExternalId,
    });
    return {
      ...signature,
      contextVersion: signatureContextVersion(
        "zammad", configuration.contextVersion, signature.contextVersion,
      ),
      source: "zammad",
    };
  }

  const [user, detail] = await Promise.all([
    input.repository.getUser(input.userId),
    dispatchTicketDetailRead(input.providerContext, input.ticketExternalId),
  ]);
  if (!user || detail.status !== "available") {
    throw new ProviderError("provider-data-mismatch", "The signature preview is unavailable.", false, undefined, "signature-context-unavailable");
  }
  const groupExternalId = input.groupExternalId ?? detail.detail.ticket.group?.externalId;
  const template = selectedTemplate(configuration.templates, groupExternalId);
  if (!template) {
    return {
      contextVersion: signatureContextVersion(
        "resolvrr", configuration.contextVersion, groupExternalId ?? "default", "none",
      ),
      source: "resolvrr",
    };
  }
  let templateHtml: string;
  try {
    templateHtml = decryptSecret(template.encryptedBodyHtml, input.encryptionKey);
  } catch {
    throw new ProviderError("provider-data-mismatch", "The signature template is unavailable.", false, undefined, "signature-context-unavailable");
  }
  const renderedHtml = renderWorkspaceSignatureTemplate({
    templateHtml,
    ticket: detail.detail.ticket,
    user,
    workspaceName: configuration.workspaceDisplayName,
  });
  return {
    contextVersion: signatureContextVersion(
      "resolvrr", configuration.contextVersion, template.contextVersion, renderedHtml,
    ),
    renderedHtml,
    source: "resolvrr",
  };
}

export function assertReviewedTicketSignature(
  reviewed: TicketSignatureSelection | undefined,
  resolved: ResolvedTicketSignature,
) {
  if (!reviewed && resolved.source === "none") return;
  if (
    !reviewed || reviewed.source !== resolved.source ||
    reviewed.contextVersion !== resolved.contextVersion
  ) {
    throw new ProviderError("validation-failure", "The signature changed and must be reviewed again.", false, undefined, "signature-context-stale");
  }
}

export async function saveWorkspaceSignatureTemplate(input: {
  bodyHtml: string;
  createdByUserId: string;
  encryptionKey: string;
  groupExternalId?: string;
  repository: WorkspaceSignatureRepository;
  workspaceId: string;
}) {
  const sanitized = sanitizeSignatureTemplateHtml(input.bodyHtml);
  if (
    sanitized.length > 750_000 ||
    (!communicationBodyHasText(sanitized) && !sanitized.includes("<img"))
  ) return false;
  await input.repository.upsertTemplate({
    contextVersion: randomUUID(),
    createdByUserId: input.createdByUserId,
    encryptedBodyHtml: encryptSecret(sanitized, input.encryptionKey),
    groupExternalId: input.groupExternalId,
    keyVersion: "v1",
    workspaceId: input.workspaceId,
  });
  return true;
}
