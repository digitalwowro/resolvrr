"use client";

import type { WorkspaceArticle } from "@/features/tickets/workspace-adapter";
import type { TicketCustomerForwardDraft } from "./metadata-draft-types";
import { TicketArticleBody } from "./ticket-article-body";

export function TicketForwardOptions({
  article,
  disabled,
  draft,
  onChange,
}: {
  article?: WorkspaceArticle;
  disabled: boolean;
  draft: TicketCustomerForwardDraft;
  onChange(draft: TicketCustomerForwardDraft): void;
}) {
  return (
    <div className="space-y-3 border-b border-indigo-100 px-4 pb-3">
      <label className="grid grid-cols-[4rem_1fr] items-center gap-2 text-xs font-semibold text-slate-600">
        Subject
        <input
          aria-label="Forward subject"
          className="h-8 rounded-md border border-slate-200 bg-white px-2 text-sm font-normal text-slate-900 outline-none focus:border-indigo-500"
          disabled={disabled}
          maxLength={500}
          onChange={(event) => onChange({ ...draft, subject: event.currentTarget.value })}
          value={draft.subject}
        />
      </label>
      <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
        <input
          checked={draft.includeOriginal}
          disabled={disabled}
          onChange={(event) => onChange({ ...draft, includeOriginal: event.currentTarget.checked })}
          type="checkbox"
        />
        Include original message
      </label>
      {article?.attachments.length ? (
        <fieldset className="space-y-1">
          <legend className="text-xs font-semibold text-slate-600">Attachments</legend>
          {article.attachments.map((attachment) => (
            <label className="flex items-center gap-2 text-xs text-slate-700" key={attachment.id}>
              <input
                checked={draft.attachmentExternalIds.includes(attachment.id)}
                disabled={disabled}
                onChange={(event) => onChange({
                  ...draft,
                  attachmentExternalIds: event.currentTarget.checked
                    ? [...draft.attachmentExternalIds, attachment.id]
                    : draft.attachmentExternalIds.filter((id) => id !== attachment.id),
                })}
                type="checkbox"
              />
              {attachment.fileName}
            </label>
          ))}
        </fieldset>
      ) : null}
      {draft.includeOriginal && article ? (
        <details className="rounded-md border border-slate-200 bg-white px-3 py-2">
          <summary className="cursor-pointer text-xs font-medium text-slate-600">
            Preview original message
          </summary>
          <div className="max-h-64 overflow-y-auto">
            <TicketArticleBody html={article.sanitizedHtml} />
          </div>
        </details>
      ) : null}
    </div>
  );
}
