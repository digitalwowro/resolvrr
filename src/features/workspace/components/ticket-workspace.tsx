import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type {
  TicketDetailReadResult,
  TicketListReadResult,
  TicketReadUnavailableReason,
  WorkspaceTicketDetail,
  WorkspaceTicketRow,
} from "@/features/tickets";

type TicketWorkspaceProps = {
  userEmail: string;
  listResult: TicketListReadResult;
  detailResult?: TicketDetailReadResult;
  rows: WorkspaceTicketRow[];
  detail?: WorkspaceTicketDetail;
  selectedTicketId?: string;
};

const unavailableMessages: Record<TicketReadUnavailableReason, string> = {
  "no-active-connection": "No active helpdesk workspace is connected.",
  "inactive-connection": "The active helpdesk workspace is not validated.",
  "missing-credentials": "The active helpdesk workspace is missing credentials.",
  "unknown-provider": "The active helpdesk provider is not installed.",
  "unsupported-capability": "This provider does not support ticket reads yet.",
  "provider-auth-failed": "The helpdesk provider rejected the stored credentials.",
  "provider-permission-denied": "The stored credentials cannot read tickets.",
  "provider-rate-limited": "The helpdesk provider is rate limiting ticket reads.",
  "provider-temporary-failure": "The helpdesk provider could not be reached.",
  "provider-unexpected-response": "The helpdesk provider returned an unexpected response.",
  "invalid-connection": "The active helpdesk workspace URL is no longer valid.",
};

function profileInitials(email: string): string {
  return email.slice(0, 2).toUpperCase();
}

function UnavailableState({
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

function WorkspaceTopBar({ userEmail }: { userEmail: string }) {
  return (
    <header className="flex h-16 items-center gap-3 border-b border-slate-200 bg-white px-4">
      {/* eslint-disable-next-line @next/next/no-img-element -- Static brand asset supplied in public/brand. */}
      <img alt="Resolvrr" className="h-9 w-auto shrink-0" src="/brand/resolvrr-logo.svg" />
      <label className="flex h-10 min-w-0 flex-1 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500">
        <span className="sr-only">Search workspace</span>
        <input
          className="min-w-0 flex-1 bg-transparent outline-none"
          disabled
          placeholder="Search tickets"
          type="search"
        />
      </label>
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-indigo-600 font-semibold text-white">
        {profileInitials(userEmail)}
      </span>
    </header>
  );
}

function TicketList({
  rows,
  selectedTicketId,
}: {
  rows: WorkspaceTicketRow[];
  selectedTicketId?: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="border-t border-slate-200 bg-white p-6 text-sm text-slate-600">
        No tickets were returned by the active helpdesk workspace.
      </div>
    );
  }

  return (
    <div className="min-h-0 overflow-auto border-t border-slate-200 bg-white">
      <table className="w-full min-w-[860px] border-collapse text-sm">
        <thead className="sticky top-0 bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
          <tr>
            <th className="border-b border-slate-200 px-3 py-2">#</th>
            <th className="border-b border-slate-200 px-3 py-2">Title</th>
            <th className="border-b border-slate-200 px-3 py-2">Customer</th>
            <th className="border-b border-slate-200 px-3 py-2">Owner</th>
            <th className="border-b border-slate-200 px-3 py-2">State</th>
            <th className="border-b border-slate-200 px-3 py-2">Priority</th>
            <th className="border-b border-slate-200 px-3 py-2">Updated</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const selected = row.id === selectedTicketId;

            return (
              <tr
                aria-selected={selected}
                className={selected ? "bg-slate-100" : "hover:bg-slate-50"}
                key={row.id}
              >
                <td className="whitespace-nowrap border-b border-slate-100 px-3 py-2 font-medium">
                  <Link href={`/workspace?ticket=${encodeURIComponent(row.id)}`}>
                    {row.number}
                  </Link>
                </td>
                <td className="border-b border-slate-100 px-3 py-2">
                  <Link
                    className="block max-w-[28rem] truncate font-semibold text-slate-950"
                    href={`/workspace?ticket=${encodeURIComponent(row.id)}`}
                  >
                    {row.title}
                  </Link>
                  {row.preview ? (
                    <span className="block max-w-[28rem] truncate text-xs text-slate-500">
                      {row.preview}
                    </span>
                  ) : null}
                </td>
                <td className="border-b border-slate-100 px-3 py-2">{row.customer}</td>
                <td className="border-b border-slate-100 px-3 py-2">{row.owner}</td>
                <td className="border-b border-slate-100 px-3 py-2">{row.state}</td>
                <td className="border-b border-slate-100 px-3 py-2">{row.priority}</td>
                <td className="whitespace-nowrap border-b border-slate-100 px-3 py-2">
                  {row.updatedAt}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TicketDetail({
  detail,
  detailResult,
}: {
  detail?: WorkspaceTicketDetail;
  detailResult?: TicketDetailReadResult;
}) {
  if (detailResult?.status === "unavailable") {
    return (
      <aside className="min-h-0 w-[34rem] border-l border-slate-200 bg-white p-4 text-sm text-slate-600">
        {unavailableMessages[detailResult.reason]}
      </aside>
    );
  }
  if (!detail) {
    return (
      <aside className="min-h-0 w-[34rem] border-l border-slate-200 bg-white p-4 text-sm text-slate-600">
        Select a ticket to load its thread.
      </aside>
    );
  }

  return (
    <aside className="flex min-h-0 w-[34rem] flex-col border-l border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-slate-500">{detail.number}</p>
            <h2 className="truncate text-lg font-semibold text-slate-950">
              {detail.title}
            </h2>
          </div>
          {detail.providerUrl ? (
            <a
              aria-label="Open ticket in helpdesk"
              className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
              href={detail.providerUrl}
              rel="noreferrer"
              target="_blank"
            >
              <ExternalLink aria-hidden="true" className="size-4" />
            </a>
          ) : null}
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
          <div>
            <dt className="font-semibold">Customer</dt>
            <dd>{detail.customer}</dd>
          </div>
          <div>
            <dt className="font-semibold">Owner</dt>
            <dd>{detail.owner}</dd>
          </div>
          <div>
            <dt className="font-semibold">State</dt>
            <dd>{detail.state}</dd>
          </div>
          <div>
            <dt className="font-semibold">Priority</dt>
            <dd>{detail.priority}</dd>
          </div>
        </dl>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-auto p-4">
        {detail.articles.map((article) => (
          <article
            className="rounded-md border border-slate-200 bg-slate-50 p-3"
            key={article.id}
          >
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <h3 className="truncate text-sm font-semibold text-slate-950">
                {article.author}
              </h3>
              <span className="shrink-0 text-xs text-slate-500">{article.meta}</span>
            </div>
            <div
              className="prose prose-sm max-w-none text-slate-800"
              dangerouslySetInnerHTML={{ __html: article.sanitizedHtml }}
            />
          </article>
        ))}
      </div>
    </aside>
  );
}

export function TicketWorkspace({
  userEmail,
  listResult,
  detailResult,
  rows,
  detail,
  selectedTicketId,
}: TicketWorkspaceProps) {
  return (
    <main className="flex h-screen min-h-screen flex-col overflow-hidden bg-slate-100">
      <WorkspaceTopBar userEmail={userEmail} />
      {listResult.status === "unavailable" ? (
        <UnavailableState reason={listResult.reason} />
      ) : (
        <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4">
            <div>
              <h1 className="text-sm font-semibold text-slate-950">
                {listResult.connectionName}
              </h1>
              <p className="text-xs text-slate-500">Read-only ticket workspace</p>
            </div>
            <Link
              className="text-sm font-semibold text-indigo-700 hover:text-indigo-900"
              href="/workspace/connections"
            >
              Manage workspaces
            </Link>
          </div>
          <div className="flex min-h-0 flex-1 overflow-hidden">
            <div className="min-w-0 flex-1 overflow-hidden">
              <TicketList rows={rows} selectedTicketId={selectedTicketId} />
            </div>
            <TicketDetail detail={detail} detailResult={detailResult} />
          </div>
        </section>
      )}
    </main>
  );
}
