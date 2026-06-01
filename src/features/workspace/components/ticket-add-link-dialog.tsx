import { Search, X } from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui";
import type { TicketLinkRelationKind } from "@/core/tickets";
import type {
  SearchWorkspaceTicketLinkTargetsAction,
  WorkspaceTicketLinkTarget,
  WorkspaceTicketLinkTargetSearchResult,
} from "@/features/tickets/link-target-search-action-result";
import { TicketAddLinkRelationOptions } from "./ticket-add-link-relation-options";
import {
  TicketAddLinkCandidateList,
  TicketAddLinkSearchResults,
} from "./ticket-add-link-search-results";

type TicketAddLinkDialogProps = {
  canEditLinkRelations: boolean;
  currentTicketCustomerExternalId?: string;
  currentTicketExternalId: string;
  initialRelation: TicketLinkRelationKind;
  initialTicketId?: string;
  recentlyViewedTargets: WorkspaceTicketLinkTarget[];
  saving: boolean;
  searchTicketLinkTargetsAction: SearchWorkspaceTicketLinkTargetsAction;
  onAdd(input: {
    relation: TicketLinkRelationKind;
    ticketId: string;
    target?: WorkspaceTicketLinkTarget;
  }): void;
  onClose(): void;
};

export function TicketAddLinkDialog({
  canEditLinkRelations,
  currentTicketCustomerExternalId,
  currentTicketExternalId,
  initialRelation,
  initialTicketId = "",
  recentlyViewedTargets,
  saving,
  searchTicketLinkTargetsAction,
  onAdd,
  onClose,
}: TicketAddLinkDialogProps) {
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const searchSequenceRef = useRef(0);
  const [manualTicketId, setManualTicketId] = useState(initialTicketId);
  const [query, setQuery] = useState("");
  const [relation, setRelation] =
    useState<TicketLinkRelationKind>(initialRelation);
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] =
    useState<WorkspaceTicketLinkTargetSearchResult>({
      status: "available",
      targets: [],
    });
  const [customerSearching, setCustomerSearching] = useState(
    Boolean(currentTicketCustomerExternalId),
  );
  const [customerSearchResult, setCustomerSearchResult] =
    useState<WorkspaceTicketLinkTargetSearchResult>({
      status: "available",
      targets: [],
    });
  const [selectedTarget, setSelectedTarget] =
    useState<WorkspaceTicketLinkTarget | undefined>();
  const trimmedManualTicketId = manualTicketId.trim();
  const canSubmit = Boolean(selectedTarget || trimmedManualTicketId) && !saving;
  const trimmedQuery = query.trim();
  const showManualTicketId =
    Boolean(initialTicketId) ||
    searchResult.status === "unavailable" ||
    (searchResult.status === "available" &&
      Boolean(trimmedQuery) &&
      !searching &&
      searchResult.targets.length === 0);
  const selectedOrManualExternalId =
    selectedTarget?.externalId ?? trimmedManualTicketId;
  const visibleRecentlyViewedTargets = recentlyViewedTargets.filter(
    (target) =>
      target.externalId !== currentTicketExternalId &&
      target.externalId !== selectedOrManualExternalId,
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!currentTicketCustomerExternalId) {
      return;
    }

    let canceled = false;
    void searchTicketLinkTargetsAction({
      customerExternalId: currentTicketCustomerExternalId,
      excludeTicketExternalId: currentTicketExternalId,
    })
      .then((result) => {
        if (!canceled) {
          setCustomerSearchResult(result);
        }
      })
      .catch(() => {
        if (!canceled) {
          setCustomerSearchResult({
            status: "unavailable",
            reason: "provider-temporary-failure",
            retryable: true,
          });
        }
      })
      .finally(() => {
        if (!canceled) {
          setCustomerSearching(false);
        }
      });

    return () => {
      canceled = true;
    };
  }, [
    currentTicketCustomerExternalId,
    currentTicketExternalId,
    searchTicketLinkTargetsAction,
  ]);

  function updateQuery(nextQuery: string) {
    setQuery(nextQuery);
    setSelectedTarget(undefined);
    if (!nextQuery.trim()) {
      searchSequenceRef.current += 1;
      setSearching(false);
      setSearchResult({ status: "available", targets: [] });
      return;
    }

    const sequence = searchSequenceRef.current + 1;
    searchSequenceRef.current = sequence;
    setSearchResult({ status: "available", targets: [] });
    setSearching(true);
    void searchTicketLinkTargetsAction({
      excludeTicketExternalId: currentTicketExternalId,
      query: nextQuery,
    })
      .then((result) => {
        if (searchSequenceRef.current === sequence) {
          setSearchResult(result);
        }
      })
      .catch(() => {
        if (searchSequenceRef.current === sequence) {
          setSearchResult({
            status: "unavailable",
            reason: "provider-temporary-failure",
            retryable: true,
          });
        }
      })
      .finally(() => {
        if (searchSequenceRef.current === sequence) {
          setSearching(false);
        }
      });
  }

  function selectTarget(target: WorkspaceTicketLinkTarget) {
    setSelectedTarget(target);
    setManualTicketId(target.externalId);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ticketId = selectedTarget?.externalId ?? trimmedManualTicketId;
    if (ticketId) {
      onAdd({ relation, ticketId, target: selectedTarget });
    }
  }

  const dialog = (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 px-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <form
        aria-labelledby={titleId}
        aria-modal="true"
        className="flex max-h-[min(42rem,calc(100vh-2rem))] w-full max-w-xl flex-col rounded-lg border border-slate-200 bg-white shadow-xl"
        onSubmit={handleSubmit}
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-3">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-slate-950" id={titleId}>
              Add ticket link
            </h2>
            <p className="text-xs text-slate-600">
              Search for a ticket, then choose how it relates.
            </p>
          </div>
          <button
            aria-label="Close add link dialog"
            className="grid size-7 shrink-0 place-items-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <div className="space-y-2">
            <label
              className="block text-xs font-semibold text-slate-700"
              htmlFor={`${titleId}-ticket-search`}
            >
              Search tickets
            </label>
            <div className="relative">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
              />
              <input
                className="h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                disabled={saving}
                id={`${titleId}-ticket-search`}
                onChange={(event) => updateQuery(event.currentTarget.value)}
                placeholder="Ticket number, title, or message text"
                ref={inputRef}
                value={query}
              />
            </div>
          </div>
          <section aria-label="Search results" className="space-y-2">
            <div className="text-xs font-semibold text-slate-700">
              Search results
            </div>
            <TicketAddLinkSearchResults
              onSelectTarget={selectTarget}
              query={query}
              searching={searching}
              searchResult={searchResult}
              selectedTarget={selectedTarget}
            />
          </section>
          {currentTicketCustomerExternalId ? (
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
                  onSelectTarget={selectTarget}
                  selectedTarget={selectedTarget}
                  targets={customerSearchResult.targets}
                />
              )}
            </section>
          ) : null}
          <section aria-label="Recently viewed" className="space-y-2">
            <div className="text-xs font-semibold text-slate-700">
              Recently viewed
            </div>
            <TicketAddLinkCandidateList
              emptyMessage="No recently viewed tickets in this session."
              onSelectTarget={selectTarget}
              selectedTarget={selectedTarget}
              targets={visibleRecentlyViewedTargets}
            />
          </section>
          {showManualTicketId ? (
            <div className="space-y-2">
              <label
                className="block text-xs font-semibold text-slate-700"
                htmlFor={`${titleId}-manual-ticket-id`}
              >
                Manual related ticket ID
              </label>
              <input
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                disabled={saving}
                id={`${titleId}-manual-ticket-id`}
                onChange={(event) => {
                  setManualTicketId(event.currentTarget.value);
                  setSelectedTarget(undefined);
                }}
                placeholder="Related ticket ID"
                value={manualTicketId}
              />
            </div>
          ) : null}
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
          <TicketAddLinkRelationOptions
            canEditLinkRelations={canEditLinkRelations}
            onRelationChange={setRelation}
            relation={relation}
            saving={saving}
          />
          <div className="flex items-center gap-2">
            <Button disabled={saving} onClick={onClose} type="button">
              Cancel
            </Button>
            <Button disabled={!canSubmit} type="submit" variant="primary">
              Add link
            </Button>
          </div>
        </div>
      </form>
    </div>
  );

  return createPortal(dialog, document.body);
}
