import Link from "next/link";
import type { TicketReadUnavailableReason } from "@/features/tickets";

const unavailableMessages: Record<TicketReadUnavailableReason, string> = {
  "no-active-connection": "No active helpdesk workspace is connected.",
  "inactive-connection": "The active helpdesk workspace is not validated.",
  "missing-credentials": "The active helpdesk workspace is missing credentials.",
  "unknown-provider": "The active helpdesk workspace is not available.",
  "unsupported-capability": "The active helpdesk workspace cannot load tickets yet.",
  "provider-auth-failed": "The helpdesk workspace rejected the stored credentials.",
  "provider-permission-denied": "The stored credentials cannot read tickets.",
  "provider-rate-limited": "The helpdesk workspace is rate limiting ticket reads.",
  "provider-temporary-failure": "The helpdesk workspace could not be reached.",
  "provider-unexpected-response": "The helpdesk workspace returned an unexpected response.",
  "unsupported-query": "The active helpdesk workspace cannot run this ticket query.",
  "query-too-expensive": "This ticket query is too expensive for the active helpdesk workspace.",
  "invalid-connection": "The active helpdesk workspace URL is no longer valid.",
};

export function UnavailableState({
  reason,
}: {
  reason: TicketReadUnavailableReason;
}) {
  return (
    <section className="flex min-h-0 flex-1 items-center justify-center bg-slate-50 px-4">
      <div className="max-w-lg rounded-md border border-slate-200 bg-white p-5 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-slate-950">Tickets unavailable</h1>
        <p className="mt-2 text-sm text-slate-600">{unavailableMessages[reason]}</p>
        <Link
          className="mt-4 inline-flex h-9 items-center rounded-md bg-slate-950 px-3 text-sm font-semibold text-white"
          href="/workspace/connections"
        >
          Manage workspaces
        </Link>
      </div>
    </section>
  );
}

export function DetailUnavailableState({
  reason,
}: {
  reason: TicketReadUnavailableReason;
}) {
  return (
    <section className="flex min-h-0 flex-1 items-center justify-center border-x border-t border-slate-200 bg-white px-4 text-center">
      <p className="max-w-sm text-sm text-slate-600">{unavailableMessages[reason]}</p>
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
