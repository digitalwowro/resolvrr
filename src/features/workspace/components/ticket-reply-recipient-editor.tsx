"use client";

import { AlertTriangle, X } from "lucide-react";
import { useState, type KeyboardEvent } from "react";
import { normalizedReplyAddress } from "@/features/tickets/reply-input";
import type {
  TicketCustomerForwardDraft,
  TicketCustomerReplyDraft,
} from "./metadata-draft-types";

type RecipientDraft = TicketCustomerReplyDraft | TicketCustomerForwardDraft;

function RecipientRow({
  disabled,
  label,
  onChange,
  values,
}: {
  disabled: boolean;
  label: "To" | "Cc";
  onChange(values: string[]): void;
  values: string[];
}) {
  const [entry, setEntry] = useState("");
  const [error, setError] = useState("");

  function addEntry() {
    const address = normalizedReplyAddress(entry);
    if (!address) {
      if (entry.trim()) setError("Enter a valid email address.");
      return;
    }
    setError("");
    setEntry("");
    if (!values.includes(address)) onChange([...values, address]);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addEntry();
    }
  }

  return (
    <div className="grid grid-cols-[2rem_1fr] gap-2">
      <label className="pt-1.5 text-xs font-semibold text-slate-600" htmlFor={`reply-${label}`}>
        {label}
      </label>
      <div>
        <div className="flex min-h-8 flex-wrap items-center gap-1 rounded-md border border-slate-200 bg-white px-1.5 py-1 focus-within:border-indigo-500">
          {values.map((address) => (
            <span
              className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-800"
              key={address}
            >
              {address}
              <button
                aria-label={`Remove ${address} from ${label}`}
                className="rounded text-slate-500 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600"
                disabled={disabled}
                onClick={() => onChange(values.filter((value) => value !== address))}
                type="button"
              >
                <X aria-hidden="true" className="size-3" />
              </button>
            </span>
          ))}
          <input
            aria-describedby={error ? `reply-${label}-error` : undefined}
            className="min-w-40 flex-1 bg-transparent px-1 py-0.5 text-sm outline-none placeholder:text-slate-400"
            disabled={disabled}
            id={`reply-${label}`}
            onBlur={addEntry}
            onChange={(event) => {
              setEntry(event.currentTarget.value);
              setError("");
            }}
            onKeyDown={handleKeyDown}
            placeholder="Add email address"
            type="email"
            value={entry}
          />
        </div>
        {error ? (
          <p className="mt-1 text-xs text-rose-700" id={`reply-${label}-error`} role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function TicketReplyRecipientEditor({
  disabled,
  draft,
  managedAddresses,
  onChange,
}: {
  disabled: boolean;
  draft: RecipientDraft;
  managedAddresses: string[];
  onChange(draft: RecipientDraft): void;
}) {
  const managed = new Set(managedAddresses.map((address) => address.toLowerCase()));
  const includesManaged = [...draft.to, ...draft.cc].some((address) =>
    managed.has(address.toLowerCase()),
  );
  return (
    <div className="space-y-2 border-b border-indigo-100 pb-3">
      <RecipientRow
        disabled={disabled}
        label="To"
        onChange={(to) => {
          const selected = new Set(to);
          onChange({ ...draft, to, cc: draft.cc.filter((address) => !selected.has(address)) });
        }}
        values={draft.to}
      />
      <RecipientRow
        disabled={disabled}
        label="Cc"
        onChange={(cc) => {
          const selected = new Set(draft.to);
          onChange({ ...draft, cc: cc.filter((address) => !selected.has(address)) });
        }}
        values={draft.cc}
      />
      {includesManaged ? (
        <p className="flex items-center gap-1.5 text-xs text-amber-700" role="status">
          <AlertTriangle aria-hidden="true" className="size-3.5" />
          A helpdesk system address is included. Review it before updating.
        </p>
      ) : null}
    </div>
  );
}
