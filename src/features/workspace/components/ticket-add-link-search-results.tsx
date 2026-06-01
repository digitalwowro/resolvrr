import { cn } from "@/components/ui/classnames";
import {
  ticketPriorityDefinitions,
  ticketStateDefinitions,
} from "@/core/tickets";
import type {
  WorkspaceTicketLinkTarget,
  WorkspaceTicketLinkTargetSearchResult,
} from "@/features/tickets/link-target-search-action-result";

type TicketAddLinkSearchResultsProps = {
  query: string;
  searching: boolean;
  searchResult: WorkspaceTicketLinkTargetSearchResult;
  selectedTarget?: WorkspaceTicketLinkTarget;
  onSelectTarget(target: WorkspaceTicketLinkTarget): void;
};

function unavailableMessage(result: WorkspaceTicketLinkTargetSearchResult) {
  if (result.status === "available") {
    return undefined;
  }
  if (result.reason === "unsupported-capability") {
    return "Search is unavailable for this workspace. Enter a related ticket ID manually.";
  }
  if (result.reason === "provider-permission-denied") {
    return "The helpdesk account cannot search tickets. Enter a related ticket ID manually.";
  }
  if (result.reason === "provider-rate-limited") {
    return "Search is rate limited. Enter a related ticket ID manually or try again later.";
  }
  return "Ticket search is temporarily unavailable. Enter a related ticket ID manually or try again.";
}

function contextLine(target: WorkspaceTicketLinkTarget) {
  return [
    target.customer,
    target.state ? ticketStateDefinitions[target.state].label : undefined,
    target.priority ? ticketPriorityDefinitions[target.priority].label : undefined,
  ].filter(Boolean).join(" · ");
}

export function TicketAddLinkSearchResults({
  query,
  searching,
  searchResult,
  selectedTarget,
  onSelectTarget,
}: TicketAddLinkSearchResultsProps) {
  const searchUnavailable =
    searchResult.status === "unavailable" ? searchResult : undefined;
  const targets =
    searchResult.status === "available" && query.trim()
      ? searchResult.targets
      : [];

  if (!query.trim()) {
    return (
      <div className="rounded-md border border-slate-200 px-3 py-3 text-sm text-slate-500">
        Enter search text to find link targets.
      </div>
    );
  }

  if (searching) {
    return (
      <div className="rounded-md border border-slate-200 px-3 py-3 text-sm text-slate-500">
        Searching tickets...
      </div>
    );
  }

  if (searchUnavailable) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">
        {unavailableMessage(searchUnavailable)}
      </div>
    );
  }

  if (targets.length === 0) {
    return (
      <div className="rounded-md border border-slate-200 px-3 py-3 text-sm text-slate-500">
        No matching tickets found. Enter a related ticket ID manually.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-slate-200">
      {targets.map((target) => {
        const selected = selectedTarget?.externalId === target.externalId;
        return (
          <button
            aria-pressed={selected}
            className={cn(
              "block w-full border-b border-slate-200 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none",
              selected && "bg-indigo-50",
            )}
            key={target.externalId}
            onClick={() => onSelectTarget(target)}
            type="button"
          >
            <span className="block font-semibold text-slate-950">
              #{target.number} {target.title}
            </span>
            {contextLine(target) ? (
              <span className="block text-xs text-slate-600">
                {contextLine(target)}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
