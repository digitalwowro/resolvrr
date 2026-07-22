import type { TicketReadUnavailableReason } from "@/features/tickets/read-model";

const unavailableMessages: Record<TicketReadUnavailableReason, string> = {
  "no-active-connection": "No active helpdesk workspace is connected.",
  "inactive-connection": "The active helpdesk workspace is not validated.",
  "missing-credentials": "The active helpdesk workspace is missing credentials.",
  "personal-connection-required":
    "Connect your own helpdesk account to use this workspace.",
  "unknown-provider": "The active helpdesk workspace is not available.",
  "unsupported-capability": "The active helpdesk workspace cannot load tickets yet.",
  "provider-auth-failed": "The helpdesk workspace rejected the stored credentials.",
  "provider-permission-denied": "The stored credentials cannot read tickets.",
  "provider-rate-limited": "The helpdesk workspace is rate limiting ticket reads.",
  "provider-temporary-failure": "The helpdesk workspace could not be reached.",
  "provider-unexpected-response": "The helpdesk workspace returned an unexpected response.",
  "invalid-search-query": "The ticket search query is invalid.",
  "unsupported-query": "The active helpdesk workspace cannot run this ticket query.",
  "query-too-expensive": "This ticket query is too expensive for the active helpdesk workspace.",
  "invalid-connection": "The active helpdesk workspace URL is no longer valid.",
};

export function UnavailableState({
  onOpenWorkspaces,
  reason,
}: {
  onOpenWorkspaces(): void;
  reason: TicketReadUnavailableReason;
}) {
  const firstWorkspace = reason === "no-active-connection";

  return (
    <section className="flex min-h-0 flex-1 items-center justify-center bg-slate-50 px-4">
      <div className="max-w-lg rounded-md border border-slate-200 bg-white p-5 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-slate-950">Tickets unavailable</h1>
        {firstWorkspace ? (
          <p className="mt-2 text-sm text-slate-600">
            Create your first workspace by clicking{" "}
            <button
              className="font-semibold text-indigo-700 underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              onClick={onOpenWorkspaces}
              type="button"
            >
              here
            </button>
            .
          </p>
        ) : (
          <p className="mt-2 text-sm text-slate-600">
            {unavailableMessages[reason]}
          </p>
        )}
        <button
          className="mt-4 inline-flex h-9 items-center rounded-md bg-slate-950 px-3 text-sm font-semibold text-white"
          onClick={onOpenWorkspaces}
          type="button"
        >
          Open settings
        </button>
      </div>
    </section>
  );
}

export function DetailUnavailableState({
  onRetry,
  reason,
}: {
  onRetry?(): void;
  reason: TicketReadUnavailableReason;
}) {
  return (
    <section className="flex min-h-0 flex-1 items-center justify-center border-x border-t border-slate-200 bg-white px-4 text-center">
      <div className="max-w-sm">
        <p className="text-sm text-slate-600">{unavailableMessages[reason]}</p>
        {onRetry ? (
          <button
            className="mt-4 inline-flex h-9 items-center rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            onClick={onRetry}
            type="button"
          >
            Retry
          </button>
        ) : null}
      </div>
    </section>
  );
}

export function DetailRetiredState() {
  return (
    <section className="flex min-h-0 flex-1 items-center justify-center border-x border-t border-slate-200 bg-white px-4 text-center">
      <div className="max-w-sm">
        <h2 className="text-base font-semibold text-slate-950">Ticket unavailable</h2>
        <p className="mt-2 text-sm text-slate-600">
          This ticket was merged, but its destination is unavailable.
        </p>
      </div>
    </section>
  );
}

export function DetailLoadingState() {
  return (
    <section className="flex min-h-0 flex-1 items-center justify-center border-x border-t border-slate-200 bg-white px-4 text-center">
      <p className="max-w-sm text-sm text-slate-600">Loading ticket thread...</p>
    </section>
  );
}

export function EmptyDetailState() {
  return (
    <section className="flex min-h-0 flex-1 items-center justify-center border-x border-t border-slate-200 bg-white px-4 text-center">
      <p className="max-w-sm text-sm text-slate-600">
        Select a ticket to load its thread.
      </p>
    </section>
  );
}
