"use client";

import { Send } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui";
import { cn } from "@/components/ui/classnames";
import type {
  TicketCustomerReplyActionState,
  TicketCustomerReplyPayload,
  TicketInternalNoteActionState,
  TicketInternalNotePayload,
} from "@/features/tickets/communication-model";
import type { WorkspaceArticle } from "@/features/tickets/workspace-adapter";

export type InlineCommunicationMode = "comment" | "reply";

type InlineCommunicationComposerProps = {
  addTicketCustomerReplyAction(
    request: TicketCustomerReplyPayload,
  ): Promise<TicketCustomerReplyActionState>;
  addTicketInternalNoteAction(
    request: TicketInternalNotePayload,
  ): Promise<TicketInternalNoteActionState>;
  article: WorkspaceArticle;
  articleClassName: string;
  mode: InlineCommunicationMode;
  onCancel(): void;
  onSaved(ticketId: string): void;
  panelClassName: string;
  ticketExternalId: string;
};

function statusText(
  saving: boolean,
  mode: InlineCommunicationMode,
  result: TicketCustomerReplyActionState | TicketInternalNoteActionState,
) {
  if (saving) {
    return mode === "comment" ? "Adding comment..." : "Sending reply...";
  }
  if (result.status === "failed" || result.status === "saved-refresh-failed") {
    return result.message;
  }
  if (result.status === "saved") {
    return result.message;
  }
  return undefined;
}

export function TicketInlineCommunicationComposer({
  addTicketCustomerReplyAction,
  addTicketInternalNoteAction,
  article,
  articleClassName,
  mode,
  onCancel,
  onSaved,
  panelClassName,
  ticketExternalId,
}: InlineCommunicationComposerProps) {
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<
    TicketCustomerReplyActionState | TicketInternalNoteActionState
  >({ status: "idle" });
  const label = mode === "comment" ? "Comment" : "Reply";
  const canSubmit = body.trim().length > 0 && !saving;
  const message = statusText(saving, mode, result);

  function submit() {
    if (!canSubmit) {
      return;
    }

    setSaving(true);
    setResult({ status: "idle" });
    const request = { body, ticketExternalId };
    const action = mode === "comment"
      ? addTicketInternalNoteAction(request)
      : addTicketCustomerReplyAction(request);

    void action
      .then((nextResult) => {
        setResult(nextResult);
        if (
          nextResult.status === "saved" ||
          nextResult.status === "saved-refresh-failed"
        ) {
          setBody("");
        }
        if (nextResult.status === "saved") {
          onSaved(ticketExternalId);
        }
      })
      .catch(() =>
        setResult({
          status: "failed",
          message: mode === "comment"
            ? "The comment could not be added. Try again."
            : "The customer reply could not be sent. Try again.",
        }),
      )
      .finally(() => setSaving(false));
  }

  return (
    <form
      aria-label={`${label} composer for ${article.author}`}
      className={cn("border-t px-4 py-3", articleClassName)}
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div className={cn("overflow-hidden rounded-md border bg-white", panelClassName)}>
        <label className="sr-only" htmlFor={`${mode}-${article.id}`}>
          {label}
        </label>
        <textarea
          className="block min-h-24 w-full resize-y border-0 bg-white px-3 py-2 text-sm leading-5 text-slate-900 outline-none placeholder:text-slate-400 focus:ring-0"
          disabled={saving}
          id={`${mode}-${article.id}`}
          onChange={(event) => {
            setBody(event.target.value);
            setResult({ status: "idle" });
          }}
          placeholder={mode === "comment" ? "Write a comment..." : "Write a reply..."}
          value={body}
        />
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-2 py-2">
          <Button
            className="!h-7 !px-2 !text-xs"
            disabled={saving}
            onClick={onCancel}
            type="button"
            variant="secondary"
          >
            Cancel
          </Button>
          <Button
            className="!h-7 !px-2 !text-xs"
            disabled={!canSubmit}
            type="submit"
            variant="primary"
          >
            <Send aria-hidden="true" className="size-3.5" />
            Send
          </Button>
        </div>
      </div>
      {message ? (
        <p
          className={
            result.status === "failed" || result.status === "saved-refresh-failed"
              ? "mt-2 text-xs text-amber-700"
              : "mt-2 text-xs text-slate-600"
          }
          role={saving || result.status === "saved" ? "status" : "alert"}
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
