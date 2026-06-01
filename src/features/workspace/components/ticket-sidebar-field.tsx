import type { ReactNode } from "react";

export function SidebarField({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <div className="block w-full space-y-1">
      <span className="block text-xs font-semibold">{label}</span>
      <div className="min-h-9 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
        {children}
      </div>
    </div>
  );
}

export function EditableSidebarField({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <div className="block w-full space-y-1">
      <span className="block text-xs font-semibold">{label}</span>
      {children}
    </div>
  );
}
