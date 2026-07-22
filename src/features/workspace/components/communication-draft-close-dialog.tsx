"use client";

export function CommunicationDraftCloseDialog({
  onCancel,
  onDiscard,
  onKeep,
}: {
  onCancel(): void;
  onDiscard(): void;
  onKeep(): void;
}) {
  return (
    <div
      aria-labelledby="communication-draft-close-title"
      aria-modal="true"
      className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/30 p-4"
      role="dialog"
    >
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
        <h2 className="text-base font-semibold text-slate-950" id="communication-draft-close-title">
          Close this ticket tab?
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          This ticket has an unsent personal draft.
        </p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100" onClick={onCancel} type="button">
            Cancel
          </button>
          <button className="rounded-md border border-rose-200 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50" onClick={onDiscard} type="button">
            Discard &amp; close
          </button>
          <button className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700" onClick={onKeep} type="button">
            Keep draft &amp; close
          </button>
        </div>
      </div>
    </div>
  );
}
