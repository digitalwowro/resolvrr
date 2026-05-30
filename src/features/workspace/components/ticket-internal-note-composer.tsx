"use client";

import { MessageSquarePlus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui";
import type {
  TicketCommunicationCapabilities,
  TicketInternalNoteActionState,
  TicketInternalNotePayload,
} from "@/features/tickets/communication-model";

type TicketInternalNoteComposerProps = {
  addTicketInternalNoteAction(
    request: TicketInternalNotePayload,
  ): Promise<TicketInternalNoteActionState>;
  communicationCapabilities: TicketCommunicationCapabilities;
  onNoteSaved(ticketId: string): void;
  ticketExternalId: string;
};

function noteStatusText(
  saving: boolean,
  result: TicketInternalNoteActionState,
) {
  if (saving) {
    return "Adding note...";
  }
  if (result.status === "failed" || result.status === "saved-refresh-failed") {
    return result.message;
  }
  if (result.status === "saved") {
    return result.message;
  }
  return undefined;
}

export function TicketInternalNoteComposer({
  addTicketInternalNoteAction,
  communicationCapabilities,
  onNoteSaved,
  ticketExternalId,
}: TicketInternalNoteComposerProps) {
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<TicketInternalNoteActionState>({
    status: "idle",
  });
  const statusText = noteStatusText(saving, result);
  const canSubmit =
    communicationCapabilities.internalNotes && body.trim().length > 0 && !saving;

  function submitNote() {
    if (!canSubmit) {
      return;
    }

    setSaving(true);
    setResult({ status: "idle" });
    void addTicketInternalNoteAction({ body, ticketExternalId })
      .then((nextResult) => {
        setResult(nextResult);
        if (
          nextResult.status === "saved" ||
          nextResult.status === "saved-refresh-failed"
        ) {
          setBody("");
        }
        if (nextResult.status === "saved") {
          onNoteSaved(ticketExternalId);
        }
      })
      .catch(() =>
        setResult({
          status: "failed",
          message: "The internal note could not be added. Try again.",
        }),
      )
      .finally(() => setSaving(false));
  }

  if (!communicationCapabilities.internalNotes) {
    return null;
  }

  return (
    <form
      className="shrink-0 border-t border-slate-200 bg-white px-4 py-3"
      onSubmit={(event) => {
        event.preventDefault();
        submitNote();
      }}
    >
      <label
        className="mb-1 block text-xs font-semibold text-slate-700"
        htmlFor={`internal-note-${ticketExternalId}`}
      >
        Internal note
      </label>
      <div className="flex items-end gap-2">
        <textarea
          className="min-h-20 flex-1 resize-y rounded-md border border-slate-300 px-3 py-2 text-sm leading-5 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          disabled={saving}
          id={`internal-note-${ticketExternalId}`}
          onChange={(event) => {
            setBody(event.target.value);
            setResult({ status: "idle" });
          }}
          value={body}
        />
        <Button className="shrink-0" disabled={!canSubmit} type="submit">
          <MessageSquarePlus aria-hidden="true" className="size-4" />
          Add note
        </Button>
      </div>
      {statusText ? (
        <p
          className={
            result.status === "failed" || result.status === "saved-refresh-failed"
              ? "mt-2 text-xs text-amber-700"
              : "mt-2 text-xs text-slate-600"
          }
          role={saving || result.status === "saved" ? "status" : "alert"}
        >
          {statusText}
        </p>
      ) : null}
    </form>
  );
}
