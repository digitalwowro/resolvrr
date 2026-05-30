import type { TicketLookupList } from "@/core/ticket-lookups";

type TicketLookupOptionsProps = {
  lookup: TicketLookupList;
};

function lookupFallbackLabel(lookup: TicketLookupList): string {
  if (lookup.status === "unsupported") {
    return "Unavailable";
  }
  if (lookup.status === "unavailable") {
    return lookup.retryable ? "Temporarily unavailable" : "Unavailable";
  }
  if (lookup.options.length === 0) {
    return "No options";
  }

  return "";
}

export function TicketLookupOptions({ lookup }: TicketLookupOptionsProps) {
  if (lookup.status !== "available" || lookup.options.length === 0) {
    return <span>{lookupFallbackLabel(lookup)}</span>;
  }

  return (
    <ul className="max-h-24 space-y-1 overflow-auto pr-1">
      {lookup.options.map((option) => (
        <li className="truncate" key={option.externalId} title={option.label}>
          {option.label}
        </li>
      ))}
    </ul>
  );
}
