import { X } from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui";

type TicketAddLinkDialogProps = {
  initialTicketId?: string;
  saving: boolean;
  onAdd(ticketId: string): void;
  onClose(): void;
};

export function TicketAddLinkDialog({
  initialTicketId = "",
  saving,
  onAdd,
  onClose,
}: TicketAddLinkDialogProps) {
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [ticketId, setTicketId] = useState(initialTicketId);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextTicketId = ticketId.trim();
    if (nextTicketId) {
      onAdd(nextTicketId);
    }
  }

  const dialog = (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 px-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <form
        aria-labelledby={titleId}
        aria-modal="true"
        className="w-full max-w-md rounded-lg border border-slate-200 bg-white shadow-xl"
        onSubmit={handleSubmit}
        role="dialog"
      >
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-950" id={titleId}>
            Add ticket link
          </h2>
          <button
            aria-label="Close add link dialog"
            className="grid size-7 shrink-0 place-items-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>
        <div className="space-y-2 px-4 py-4">
          <label
            className="block text-xs font-semibold text-slate-700"
            htmlFor={`${titleId}-ticket-id`}
          >
            Related ticket ID
          </label>
          <input
            className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            disabled={saving}
            id={`${titleId}-ticket-id`}
            onChange={(event) => setTicketId(event.currentTarget.value)}
            placeholder="Related ticket ID"
            ref={inputRef}
            value={ticketId}
          />
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 px-4 py-3">
          <Button disabled={saving} onClick={onClose} type="button">
            Cancel
          </Button>
          <Button
            disabled={!ticketId.trim() || saving}
            type="submit"
            variant="primary"
          >
            Add link
          </Button>
        </div>
      </form>
    </div>
  );

  return createPortal(dialog, document.body);
}
