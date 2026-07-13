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
        cc: [...draft.cc],
        defaultCc: [...draft.defaultCc],
        defaultTo: [...draft.defaultTo],
        to: [...draft.to],
      };
}

export function replyRecipientsEdited(draft: TicketCustomerReplyDraft): boolean {
  return !sameList(draft.to, draft.defaultTo) || !sameList(draft.cc, draft.defaultCc);
}

export function communicationDraftNeedsReplacementConfirmation(
  draft: TicketCommunicationDraft | undefined,
): boolean {
  return Boolean(
    communicationDraftBody(draft) ||
      (draft?.kind === "customer-reply" && replyRecipientsEdited(draft)),
  );
}

function sameList(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
