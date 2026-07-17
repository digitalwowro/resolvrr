import { Download, Paperclip } from "lucide-react";
import { ticketAttachmentDownloadPath } from "@/core/ticket-attachments";
import type { WorkspaceAttachment } from "@/features/tickets/workspace-adapter";

type TicketArticleAttachmentsProps = {
  articleExternalId: string;
  attachments: WorkspaceAttachment[];
  helpdeskConnectionId?: string;
  ticketExternalId: string;
};

const byteUnits = ["B", "KB", "MB", "GB"] as const;

function formatByteSize(byteSize: number): string {
  if (!Number.isFinite(byteSize) || byteSize < 0) {
    return "";
  }

  let size = byteSize;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < byteUnits.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  const formatted =
    unitIndex === 0 || size >= 10 ? Math.round(size).toString() : size.toFixed(1);

  return `${formatted} ${byteUnits[unitIndex]}`;
}

function attachmentMeta(attachment: WorkspaceAttachment): string {
  return [attachment.contentType, formatByteSize(attachment.byteSize ?? -1)]
    .filter(Boolean)
    .join(" - ");
}

export function TicketArticleAttachments({
  articleExternalId,
  attachments,
  helpdeskConnectionId,
  ticketExternalId,
}: TicketArticleAttachmentsProps) {
  if (attachments.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="Article attachments"
      className="mt-3 border-t border-slate-200/80 pt-3"
    >
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
        <Paperclip aria-hidden="true" className="size-3.5" />
        <span>
          Attachments ({attachments.length})
        </span>
      </div>
      <ul className="grid gap-1.5">
        {attachments.map((attachment) => {
          const meta = attachmentMeta(attachment);
          const content = (
            <>
              <span className="min-w-0 truncate font-medium text-slate-900">
                {attachment.fileName}
              </span>
              <span className="flex shrink-0 items-center gap-2 text-slate-500">
                {meta ? <span>{meta}</span> : null}
                {helpdeskConnectionId ? (
                  <Download aria-hidden="true" className="size-3.5" />
                ) : null}
              </span>
            </>
          );

          return (
            <li
              className="min-w-0"
              key={attachment.id}
            >
              {helpdeskConnectionId ? (
                <a
                  aria-label={`Download ${attachment.fileName}`}
                  className="flex min-w-0 items-center justify-between gap-3 rounded border border-slate-200 bg-white/70 px-2 py-1.5 text-xs hover:border-indigo-300 hover:bg-indigo-50/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                  download={attachment.fileName}
                  href={ticketAttachmentDownloadPath(helpdeskConnectionId, {
                    articleExternalId,
                    attachmentExternalId: attachment.id,
                    ticketExternalId,
                  })}
                >
                  {content}
                </a>
              ) : (
                <div className="flex min-w-0 items-center justify-between gap-3 rounded border border-slate-200 bg-white/70 px-2 py-1.5 text-xs">
                  {content}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
