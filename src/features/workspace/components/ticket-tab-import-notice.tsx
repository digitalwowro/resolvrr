import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { TicketTabImportNotice as Notice } from "./use-ticket-tab-import";

export function TicketTabImportNotice({ notice }: { notice?: Notice }) {
  if (!notice) return null;
  const Icon = notice.tone === "error" ? AlertTriangle : CheckCircle2;
  return (
    <div
      className="fixed right-5 top-16 z-50 flex max-w-md items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-lg"
      role={notice.tone === "error" ? "alert" : "status"}
    >
      <Icon
        aria-hidden="true"
        className={notice.tone === "error" ? "size-4 text-amber-600" : "size-4 text-emerald-600"}
      />
      <span>{notice.message}</span>
    </div>
  );
}
