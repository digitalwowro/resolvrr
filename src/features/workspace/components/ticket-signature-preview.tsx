"use client";

import { ChevronRight } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui";
import type { TicketSignaturePreviewState } from "./use-ticket-signature-preview";

export function TicketSignaturePreview({
  defaultExpanded = false,
  onRetry,
  preview,
}: {
  defaultExpanded?: boolean;
  onRetry(): void;
  preview: TicketSignaturePreviewState;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const contentId = useId();
  if (preview.status === "idle") return null;
  if (preview.status === "loading") {
    return (
      <div className="border-t border-slate-200 px-3 py-2 text-xs text-slate-500" role="status">
        Loading signature preview…
      </div>
    );
  }
  if (preview.status === "unavailable") {
    return (
      <div className="flex items-center justify-between gap-3 border-t border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900" role="alert">
        <span>{preview.message}</span>
        {preview.retryable ? (
          <Button onClick={onRetry} type="button" variant="secondary">Retry</Button>
        ) : null}
      </div>
    );
  }
  const sourceLabel = preview.signature.source === "zammad"
    ? "Zammad"
    : preview.signature.source === "resolvrr" ? "Resolvrr" : undefined;
  if (!preview.signature.renderedHtml) {
    return (
      <div className="border-t border-slate-200 px-3 py-2 text-xs text-slate-500">
        {sourceLabel
          ? `No ${sourceLabel} signature is configured for this ticket.`
          : "No signature will be added."}
      </div>
    );
  }
  return (
    <div className="border-t border-slate-200">
      <button
        aria-controls={contentId}
        aria-expanded={expanded}
        aria-label={`Signature from ${sourceLabel}`}
        className="flex h-9 w-full items-center gap-1.5 px-3 text-left text-xs font-medium text-slate-600 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-indigo-600"
        onClick={() => setExpanded((current) => !current)}
        type="button"
      >
        <ChevronRight
          aria-hidden="true"
          className={`size-3.5 transition-transform ${expanded ? "rotate-90" : ""}`}
        />
        Signature from {sourceLabel}
        <span className="ml-auto font-normal text-slate-400">Read-only</span>
      </button>
      {expanded ? (
        <div
          className="px-3 pb-3 text-sm text-slate-800 [&_img]:h-auto [&_img]:max-h-48 [&_img]:max-w-full"
          dangerouslySetInnerHTML={{ __html: preview.signature.renderedHtml }}
          id={contentId}
        />
      ) : null}
    </div>
  );
}
