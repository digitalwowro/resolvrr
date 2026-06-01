import type { ReactNode } from "react";

export function TicketDetailSidebar({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <aside className="w-56 shrink-0 space-y-4 overflow-y-auto py-4 pl-2 pr-4">
      {children}
    </aside>
  );
}
