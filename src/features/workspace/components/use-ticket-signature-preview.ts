"use client";

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type {
  TicketSignatureContext,
  TicketSignatureSelection,
} from "@/core/ticket-signatures";
import type { LoadTicketSignaturePreviewAction } from "@/features/signatures";
import type { SelectedTicketDraft, TicketCommunicationDraft } from "./metadata-draft";

export type TicketSignaturePreviewState =
  | { status: "idle" }
  | { status: "loading" }
  | { signature: TicketSignatureContext; status: "available" }
  | { message: string; retryable: boolean; status: "unavailable" };

export function ticketSignatureSelectionMatches(
  selected: TicketSignatureSelection | undefined,
  signature: TicketSignatureContext,
) {
  return selected?.source === signature.source &&
    selected.contextVersion === signature.contextVersion;
}

export function ticketCommunicationSignatureReady(
  communication: TicketCommunicationDraft | undefined,
  preview: TicketSignaturePreviewState,
) {
  if (!communication || communication.kind === "internal-comment") return true;
  return preview.status === "available" && ticketSignatureSelectionMatches(
    communication.signatureContext,
    preview.signature,
  );
}

export function useTicketSignaturePreview(input: {
  action: LoadTicketSignaturePreviewAction;
  communication?: TicketCommunicationDraft;
  groupExternalId?: string;
  onSelectionChange(selection: TicketSignatureSelection): void;
  ticketExternalId: string;
}) {
  const [resolved, setResolved] = useState<{
    key: string;
    state: TicketSignaturePreviewState;
  }>();
  const [attempt, setAttempt] = useState(0);
  const onSelectionChangeRef = useRef(input.onSelectionChange);
  useEffect(() => {
    onSelectionChangeRef.current = input.onSelectionChange;
  }, [input.onSelectionChange]);

  const communication = input.communication;
  const sourceArticleExternalId = communication?.kind === "customer-reply" ||
    communication?.kind === "customer-forward"
    ? communication.sourceArticleExternalId
    : undefined;
  const { action, groupExternalId, ticketExternalId } = input;
  const requestKey = sourceArticleExternalId
    ? `${ticketExternalId}:${groupExternalId ?? ""}:${sourceArticleExternalId}:${attempt}`
    : "";

  useEffect(() => {
    if (!sourceArticleExternalId) return;
    let cancelled = false;
    void action({
      groupExternalId,
      ticketExternalId,
    }).then((result) => {
      if (cancelled) return;
      if (result.status === "available") {
        setResolved({ key: requestKey, state: result });
        onSelectionChangeRef.current({
          contextVersion: result.signature.contextVersion,
          source: result.signature.source,
        });
      } else {
        setResolved({ key: requestKey, state: result });
      }
    }).catch(() => {
      if (!cancelled) {
        setResolved({ key: requestKey, state: {
          message: "The signature could not be loaded. Retry before updating.",
          retryable: true,
          status: "unavailable",
        } });
      }
    });
    return () => { cancelled = true; };
  }, [
    action,
    groupExternalId,
    requestKey,
    sourceArticleExternalId,
    ticketExternalId,
  ]);

  return {
    retry: () => setAttempt((current) => current + 1),
    state: !sourceArticleExternalId
      ? { status: "idle" } as const
      : resolved?.key === requestKey ? resolved.state : { status: "loading" } as const,
  };
}

export function useSelectedTicketSignaturePreview(input: {
  action: LoadTicketSignaturePreviewAction;
  draft: SelectedTicketDraft;
  setDraft: Dispatch<SetStateAction<SelectedTicketDraft>>;
  ticketExternalId: string;
}) {
  return useTicketSignaturePreview({
    action: input.action,
    communication: input.draft.communication,
    groupExternalId: input.draft.metadata.groupExternalId,
    onSelectionChange: (signatureContext) => input.setDraft((current) => {
      const communication = current.communication;
      if (
        !communication || communication.kind === "internal-comment" ||
        ticketSignatureSelectionMatches(communication.signatureContext, signatureContext)
      ) return current;
      return { ...current, communication: { ...communication, signatureContext } };
    }),
    ticketExternalId: input.ticketExternalId,
  });
}
