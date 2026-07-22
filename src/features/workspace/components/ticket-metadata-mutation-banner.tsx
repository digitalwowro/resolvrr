import { AlertTriangle } from "lucide-react";
import type { TicketMetadataMutationActionState } from
  "@/features/tickets/mutation-model";

export function TicketMetadataMutationBanner({
  result,
}: {
  result: TicketMetadataMutationActionState;
}) {
  if (
    result.status !== "failed" &&
    result.status !== "saved-refresh-failed" &&
    result.status !== "partially-saved"
  ) {
    return null;
  }

  const failed = result.status === "failed";
  return (
    <section
      aria-live="assertive"
      className={failed
        ? "flex shrink-0 items-start gap-3 border-t border-rose-300 bg-rose-50 px-4 py-3 text-rose-950"
        : "flex shrink-0 items-start gap-3 border-t border-amber-300 bg-amber-50 px-4 py-3 text-amber-950"}
      role="alert"
    >
      <AlertTriangle aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
      <div className="min-w-0">
        <p className="text-sm font-semibold">
          {failed ? "Update failed" : "Update needs attention"}
        </p>
        <p className="mt-0.5 text-sm leading-5">{result.message}</p>
      </div>
    </section>
  );
}
