"use client";

import type { WorkspaceArticle } from "@/features/tickets/workspace-adapter";
import type { TicketCustomerForwardDraft } from "./metadata-draft-types";

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
    <div
      aria-label="Forward options"
      className="w-full space-y-3"
      role="group"
    >
      <label className="grid w-full min-w-0 grid-cols-[4rem_minmax(0,1fr)] items-center gap-2 text-xs font-semibold text-slate-600">
        Subject
        <input
          aria-label="Forward subject"
          className="h-8 min-w-0 w-full rounded-md border border-slate-200 bg-white px-2 text-sm font-normal text-slate-900 outline-none focus:border-indigo-500"
          disabled={disabled}
          maxLength={500}
          onChange={(event) => onChange({ ...draft, subject: event.currentTarget.value })}
          value={draft.subject}
        />
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
    </div>
  );
}
