import { Paperclip } from "lucide-react";
import type { WorkspaceAttachment } from "@/features/tickets/workspace-adapter";

type TicketArticleAttachmentsProps = {
  attachments: WorkspaceAttachment[];
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
  attachments,
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

          return (
            <li
              className="flex min-w-0 items-center justify-between gap-3 rounded border border-slate-200 bg-white/70 px-2 py-1.5 text-xs"
              key={attachment.id}
            >
              <span className="min-w-0 truncate font-medium text-slate-900">
                {attachment.fileName}
              </span>
              {meta ? (
                <span className="shrink-0 text-slate-500">{meta}</span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
