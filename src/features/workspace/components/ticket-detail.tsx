import { ExternalLink } from "lucide-react";
import { Tooltip } from "@/components/ui";
import { cn } from "@/components/ui/classnames";
import type {
  TicketMetadataMutationActionState,
  TicketMetadataMutationCapabilities,
  WorkspaceTicketDetail,
} from "@/features/tickets";
import { StateCell } from "./ticket-table-cells";
import { TicketDetailSidebar } from "./ticket-detail-sidebar";
import { TicketThread } from "./ticket-thread";

type TicketDetailProps = {
  detail: WorkspaceTicketDetail;
  metadataMutationCapabilities?: TicketMetadataMutationCapabilities;
  roundedTop?: boolean;
  updateTicketMetadataAction(
    formData: FormData,
  ): Promise<TicketMetadataMutationActionState>;
};

export function TicketDetail({
  detail,
  metadataMutationCapabilities,
  roundedTop = true,
  updateTicketMetadataAction,
}: TicketDetailProps) {
  return (
    <section
      aria-label={`Ticket detail ${detail.number}`}
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-hidden border-x border-t border-slate-200 bg-white",
        roundedTop && "rounded-t-md",
      )}
    >
      <div className="border-b border-slate-200 px-4 py-3">
        <div className="space-y-2">
          <div className="flex min-w-0 items-center gap-3">
            <StateCell label={detail.state} state={detail.stateKey} />
            <span className="shrink-0 text-xl text-black">{detail.number}</span>
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              <h2 className="min-w-0 truncate text-xl font-semibold text-black">
                {detail.title}
              </h2>
              {detail.providerUrl ? (
                <Tooltip content="Open ticket in helpdesk">
                  <a
                    aria-label="Open ticket in helpdesk"
                    className="inline-grid size-6 shrink-0 place-items-center rounded-md text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                    href={detail.providerUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <ExternalLink aria-hidden="true" className="size-3.5" />
                  </a>
                </Tooltip>
              ) : null}
            </div>
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-y-1 text-xs">
            <span className="mr-1.5 inline-flex min-w-0 items-center gap-1">
              <span>Customer:</span>
              <span className="min-w-0 truncate font-semibold text-indigo-600">
                {detail.customer}
              </span>
            </span>
            <span aria-hidden="true" className="mr-1.5">
              ·
            </span>
            <span className="mr-1.5 inline-flex min-w-0 items-center gap-1">
              <span>Owner:</span>
              <span className="min-w-0 truncate font-semibold text-indigo-600">
                {detail.owner}
              </span>
            </span>
            {detail.createdAt ? (
              <>
                <span aria-hidden="true" className="mr-1.5">
                  ·
                </span>
                <span className="mr-1.5">
                  Created: <span className="font-semibold">{detail.createdAt}</span>
                </span>
              </>
            ) : null}
            <span aria-hidden="true" className="mr-1.5">
              ·
            </span>
            <span>
              Updated: <span className="font-semibold">{detail.updatedAt}</span>
            </span>
          </div>
        </div>
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <TicketThread articles={detail.articles} />
        </div>
        <TicketDetailSidebar
          detail={detail}
          metadataMutationCapabilities={metadataMutationCapabilities}
          updateTicketMetadataAction={updateTicketMetadataAction}
        />
      </div>
    </section>
  );
}
