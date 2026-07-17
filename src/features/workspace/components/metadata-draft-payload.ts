import { normalizedCommunicationBody } from "@/features/tickets/communication-body";
import type { SelectedTicketUpdatePayload } from "@/features/tickets/mutation-model";
import { sanitizeComposerHtml } from "@/security/sanitize-html";
import {
  metadataDraftDirtyFields,
  metadataDraftHasChanges,
} from "./metadata-draft";
import type { SelectedTicketDraft } from "./metadata-draft-types";
import { pendingDateTimeIso } from "./ticket-pending-date-time";

function isPendingState(value: string | undefined) {
  return value === "pending_reminder" || value === "pending_close";
}

export function metadataDraftUpdatePayload(
  baseline: SelectedTicketDraft,
  draft: SelectedTicketDraft,
): SelectedTicketUpdatePayload | undefined {
  const dirty = metadataDraftDirtyFields(baseline, draft);
  if (!metadataDraftHasChanges(dirty)) {
    return undefined;
  }
  const metadata: NonNullable<SelectedTicketUpdatePayload["metadata"]> = {};
  if (dirty.state || dirty.pendingUntil) {
    if (!draft.metadata.state) return undefined;
    metadata.state = draft.metadata.state;
    if (isPendingState(draft.metadata.state)) {
      const pendingUntil = pendingDateTimeIso(draft.metadata.pendingDateTime);
      if (!pendingUntil) return undefined;
      metadata.pendingUntil = pendingUntil;
    }
  }
  if (dirty.priority) {
    if (!draft.metadata.priority) return undefined;
    metadata.priority = draft.metadata.priority;
  }
  if (dirty.owner) {
    if (!draft.metadata.ownerExternalId) return undefined;
    metadata.ownerExternalId = draft.metadata.ownerExternalId;
  }
  if (dirty.group) {
    if (!draft.metadata.groupExternalId) return undefined;
    metadata.groupExternalId = draft.metadata.groupExternalId;
  }
  if (dirty.tags) metadata.tags = draft.metadata.tags;
  if (dirty.links) {
    if (draft.metadata.linkAddExternalId) {
      metadata.linkAddExternalId = draft.metadata.linkAddExternalId;
      metadata.linkAddRelation = draft.metadata.linkAddRelation;
    }
    if (draft.metadata.linkRemoveExternalIds.length > 0) {
      metadata.linkRemoveExternalIds = draft.metadata.linkRemoveExternalIds;
    }
  }
  if (dirty.subscription) {
    if (draft.metadata.subscriptionFollowing === undefined) return undefined;
    metadata.subscriptionFollowing = draft.metadata.subscriptionFollowing;
  }
  const body = normalizedCommunicationBody(
    sanitizeComposerHtml(draft.communication?.body ?? ""),
  );
  const hasForward = draft.communication?.kind === "customer-forward";
  const communication = (body || hasForward) && draft.communication
    ? draft.communication.kind === "internal-comment"
      ? { kind: draft.communication.kind, body, bodyFormat: "html" as const }
      : draft.communication.kind === "customer-reply" ? {
          kind: draft.communication.kind,
          body,
          bodyFormat: "html" as const,
          cc: draft.communication.cc,
          contextVersion: draft.communication.contextVersion,
          intent: draft.communication.intent,
          sourceArticleExternalId: draft.communication.sourceArticleExternalId,
          signatureContext: draft.communication.signatureContext,
          to: draft.communication.to,
        }
      : {
          attachmentExternalIds: draft.communication.attachmentExternalIds,
          body,
          bodyFormat: "html" as const,
          cc: draft.communication.cc,
          contextVersion: draft.communication.contextVersion,
          includeOriginal: draft.communication.includeOriginal,
          kind: draft.communication.kind,
          sourceArticleExternalId: draft.communication.sourceArticleExternalId,
          signatureContext: draft.communication.signatureContext,
          subject: draft.communication.subject,
          to: draft.communication.to,
        }
    : undefined;
  return {
    ...(communication ? { communication } : {}),
    ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
    ticketExternalId: draft.ticketExternalId,
  };
}
