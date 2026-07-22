"use client";

import { LoaderCircle, Search, X } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import type { TicketReadUnavailableReason } from "@/features/tickets/read-model";
import type { WorkspaceTicketRow } from "@/features/tickets/workspace-adapter";

export type WorkspaceTicketSearchProps = {
  enabled: boolean;
  error?: TicketReadUnavailableReason;
  loading: boolean;
  onQueryChange(query: string): void;
  onSelectTicket(ticketId: string): void;
  onSubmit(): void;
  query: string;
  rows: WorkspaceTicketRow[];
  totalCount?: number;
};

function resultCountLabel(loadedCount: number, totalCount?: number) {
  if (totalCount === undefined) return `${loadedCount} loaded`;
  return `${totalCount} ${totalCount === 1 ? "ticket" : "tickets"}`;
}

export function WorkspaceTicketSearch({
  enabled,
  error,
  loading,
  onQueryChange,
  onSelectTicket,
  onSubmit,
  query,
  rows,
  totalCount,
}: WorkspaceTicketSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const showResults = focused && query.trim().length > 0;

  function closePicker() {
    setFocused(false);
    setHighlightedIndex(-1);
    inputRef.current?.blur();
  }

  function submitDetailedSearch() {
    closePicker();
    onSubmit();
  }

  useEffect(() => {
    function handleShortcut(event: globalThis.KeyboardEvent) {
      if (
        !enabled ||
        event.key.toLowerCase() !== "k" ||
        (!event.metaKey && !event.ctrlKey) ||
        event.altKey
      ) {
        return;
      }
      event.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    }
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [enabled]);

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" && rows.length > 0) {
      event.preventDefault();
      setHighlightedIndex((current) => Math.min(current + 1, rows.length - 1));
      return;
    }
    if (event.key === "ArrowUp" && rows.length > 0) {
      event.preventDefault();
      setHighlightedIndex((current) => Math.max(current - 1, 0));
      return;
    }
    if (event.key === "Escape") {
      setFocused(false);
      inputRef.current?.blur();
      return;
    }
    if (event.key !== "Enter") return;
    event.preventDefault();
    const highlighted = rows[highlightedIndex];
    if (highlighted) {
      closePicker();
      onSelectTicket(highlighted.id);
      return;
    }
    submitDetailedSearch();
  }

  return (
    <div
      className="relative min-w-40 max-w-[560px] flex-1"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      }}
    >
      <label className="flex h-8 items-center gap-2 rounded-md border border-indigo-800 bg-indigo-900 px-3 text-indigo-100 focus-within:border-indigo-300 focus-within:outline focus-within:outline-2 focus-within:outline-indigo-400">
        {loading ? (
          <LoaderCircle aria-hidden="true" className="size-3 shrink-0 animate-spin text-indigo-200" />
        ) : (
          <Search aria-hidden="true" className="size-3 shrink-0 text-indigo-200" />
        )}
        <span className="sr-only">Search all tickets</span>
        <input
          ref={inputRef}
          aria-autocomplete="list"
          aria-controls={showResults ? "workspace-ticket-search-results" : undefined}
          aria-expanded={showResults}
          className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-indigo-200/70 disabled:cursor-not-allowed disabled:text-indigo-200/60"
          disabled={!enabled}
          onChange={(event) => {
            setHighlightedIndex(-1);
            onQueryChange(event.currentTarget.value);
          }}
          onFocus={() => {
            setFocused(true);
            setHighlightedIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          placeholder={enabled ? "Search all tickets" : "Ticket search unavailable"}
          role="combobox"
          type="search"
          value={query}
        />
        {query ? (
          <button
            aria-label="Clear ticket search"
            className="rounded p-0.5 text-indigo-200 hover:bg-white/10 hover:text-white"
            onClick={() => onQueryChange("")}
            type="button"
          >
            <X aria-hidden="true" className="size-3.5" />
          </button>
        ) : (
          <kbd
            aria-hidden="true"
            className="hidden h-5 shrink-0 items-center rounded border border-indigo-700 bg-indigo-800 px-1.5 text-[11px] font-medium text-indigo-100 sm:inline-flex"
          >
            Ctrl/Cmd K
          </kbd>
        )}
      </label>
      {showResults ? (
        <div
          className="absolute left-0 top-full z-50 mt-1 w-full min-w-80 overflow-hidden rounded-md border border-slate-200 bg-white text-slate-900 shadow-xl"
          id="workspace-ticket-search-results"
          role="listbox"
        >
          {rows.map((row, index) => (
            <button
              aria-selected={highlightedIndex === index}
              className={`block w-full px-3 py-2 text-left hover:bg-indigo-50 ${
                highlightedIndex === index ? "bg-indigo-50" : ""
              }`}
              key={row.id}
              onClick={() => onSelectTicket(row.id)}
              onMouseEnter={() => setHighlightedIndex(index)}
              role="option"
              type="button"
            >
              <span className="flex items-center gap-2">
                <span className="shrink-0 text-xs font-medium text-slate-500">
                  {row.number}
                </span>
                <span className="truncate text-sm font-semibold">{row.title}</span>
              </span>
              <span className="mt-0.5 block truncate text-xs text-slate-500">
                {row.customer} · {row.state} · {row.updatedAt}
              </span>
            </button>
          ))}
          {!loading && rows.length === 0 ? (
            <p className="px-3 py-3 text-sm text-slate-500">
              {error
                ? "Ticket search could not be completed."
                : "No accessible tickets match this search."}
            </p>
          ) : null}
          <button
            className="flex w-full items-center justify-between border-t border-slate-200 px-3 py-2 text-left text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
            onClick={submitDetailedSearch}
            type="button"
          >
            <span>View all results</span>
            <span className="text-xs font-medium text-slate-500">
              {resultCountLabel(rows.length, totalCount)}
            </span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
