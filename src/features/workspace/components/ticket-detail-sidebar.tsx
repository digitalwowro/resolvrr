import type { ReactNode } from "react";

export function TicketDetailSidebar({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <aside className="w-56 shrink-0 space-y-4 overflow-y-auto border-l border-slate-200 px-3 py-3">
      {children}
    </aside>
  );
}
