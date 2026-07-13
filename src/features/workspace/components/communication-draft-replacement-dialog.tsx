"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui";

export function CommunicationDraftReplacementDialog({
  onCancel,
  onConfirm,
}: {
  onCancel(): void;
  onConfirm(): void;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLElement>(null);
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
      if (event.key !== "Tab") return;
      const controls = dialogRef.current?.querySelectorAll<HTMLElement>(
        "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])",
      );
      if (!controls?.length) return;
      const first = controls[0]!;
      const last = controls[controls.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return createPortal(
    <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/35 p-4">
      <section
        aria-labelledby={titleId}
        aria-modal="true"
        className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-xl"
        ref={dialogRef}
        role="dialog"
      >
        <h2 className="text-base font-semibold text-slate-950" id={titleId}>
          Replace the current message draft?
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          The current message text or recipient edits will be discarded. Ticket metadata changes are not affected.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button autoFocus onClick={onCancel} type="button" variant="secondary">
            Keep draft
          </Button>
          <Button onClick={onConfirm} type="button" variant="primary">
            Replace draft
          </Button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
