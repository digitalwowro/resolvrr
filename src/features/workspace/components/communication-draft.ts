import { normalizedCommunicationBody } from "@/features/tickets/communication-body";
import type {
  TicketCommunicationDraft,
  TicketCustomerReplyDraft,
} from "./metadata-draft-types";

export function communicationDraftBody(
  draft: TicketCommunicationDraft | undefined,
): string {
  return normalizedCommunicationBody(draft?.body ?? "");
}

export function copyCommunicationDraft(
  draft: TicketCommunicationDraft | undefined,
): TicketCommunicationDraft | undefined {
  if (!draft) {
    return undefined;
  }
  return draft.kind === "internal-comment"
    ? { ...draft }
    : {
        ...draft,
        ...(draft.kind === "customer-forward"
          ? {
              attachmentExternalIds: [...draft.attachmentExternalIds],
              defaultAttachmentExternalIds: [...draft.defaultAttachmentExternalIds],
            }
          : {}),
        cc: [...draft.cc],
        defaultCc: [...draft.defaultCc],
        defaultTo: [...draft.defaultTo],
        to: [...draft.to],
      };
}

export function replyRecipientsEdited(
  draft: Pick<TicketCustomerReplyDraft, "to" | "cc" | "defaultTo" | "defaultCc">,
): boolean {
  return !sameList(draft.to, draft.defaultTo) || !sameList(draft.cc, draft.defaultCc);
}

export function communicationDraftNeedsReplacementConfirmation(
  draft: TicketCommunicationDraft | undefined,
): boolean {
  return Boolean(
    communicationDraftBody(draft) ||
      (draft?.kind === "customer-reply" && replyRecipientsEdited(draft)) ||
      (draft?.kind === "customer-reply" &&
        draft.includeConversationHistory !==
          draft.defaultIncludeConversationHistory) ||
      (draft?.kind === "customer-forward" && forwardDraftEdited(draft)),
  );
}

export function forwardDraftEdited(
  draft: Extract<TicketCommunicationDraft, { kind: "customer-forward" }>,
): boolean {
  return replyRecipientsEdited(draft) ||
    draft.subject !== draft.defaultSubject ||
    draft.includeConversationHistory !== draft.defaultIncludeConversationHistory ||
    !sameList(draft.attachmentExternalIds, draft.defaultAttachmentExternalIds);
}

function sameList(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
