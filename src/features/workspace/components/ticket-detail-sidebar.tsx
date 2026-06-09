import type { ReactNode } from "react";

export function TicketDetailSidebar({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <aside className="w-64 shrink-0 space-y-4 overflow-y-auto border-l border-slate-200 px-4 py-4">
      {children}
    </aside>
  );
}
