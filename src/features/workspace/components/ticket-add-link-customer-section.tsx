import type {
  WorkspaceTicketLinkTarget,
  WorkspaceTicketLinkTargetSearchResult,
} from "@/features/tickets/link-target-search-action-result";
import { TicketAddLinkCandidateList } from "./ticket-add-link-search-results";

type TicketAddLinkCustomerSectionProps = {
  customerSearchResult: WorkspaceTicketLinkTargetSearchResult;
  customerSearching: boolean;
  onSelectTarget(target: WorkspaceTicketLinkTarget): void;
  selectedTarget?: WorkspaceTicketLinkTarget;
};

export function TicketAddLinkCustomerSection({
  customerSearchResult,
  customerSearching,
  onSelectTarget,
  selectedTarget,
}: TicketAddLinkCustomerSectionProps) {
  return (
    <section aria-label="From this customer" className="space-y-2">
      <div className="text-xs font-semibold text-slate-700">
        From this customer
      </div>
      {customerSearching ? (
        <div className="rounded-md border border-slate-200 px-3 py-3 text-sm text-slate-500">
          Loading tickets from this customer...
        </div>
      ) : customerSearchResult.status === "unavailable" ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">
          Customer ticket lookup is unavailable.
        </div>
      ) : (
        <TicketAddLinkCandidateList
          emptyMessage="No other tickets from this customer."
          onSelectTarget={onSelectTarget}
          selectedTarget={selectedTarget}
          targets={customerSearchResult.targets}
        />
      )}
    </section>
  );
}
