import { Info } from "lucide-react";

export function TicketMergeNotice({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <div
      className="fixed right-5 top-16 z-50 flex max-w-sm items-center gap-2 rounded-md border border-indigo-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-lg"
      role="status"
    >
      <Info aria-hidden="true" className="size-4 shrink-0 text-indigo-600" />
      <span>{message}</span>
    </div>
  );
}
