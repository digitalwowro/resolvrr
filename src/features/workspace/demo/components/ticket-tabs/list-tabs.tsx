import { BriefcaseBusiness, List } from "lucide-react";
import { Tooltip } from "@/components/ui";

type ListTabProps = {
  active: boolean;
  savedViewLabel: string;
  onSelect(): void;
};

export function HorizontalListTab({
  active,
  savedViewLabel,
  onSelect,
}: ListTabProps) {
  return (
    <Tooltip content={`Return to list: ${savedViewLabel}`} side="bottom">
      <button
        aria-label={`Return to list: ${savedViewLabel}`}
        aria-selected={active}
        className={
          active
            ? "relative z-10 inline-flex h-9 min-w-16 translate-y-px items-center justify-center gap-2 rounded-t-md border border-b-0 border-slate-200 bg-white px-3 text-indigo-700"
            : "inline-flex h-9 min-w-16 items-center justify-center gap-2 rounded-t-md border border-b-0 border-slate-200 bg-indigo-50 px-3 text-indigo-700 hover:bg-white"
        }
        onClick={onSelect}
        role="tab"
        type="button"
      >
        <BriefcaseBusiness aria-hidden="true" className="size-3.5 shrink-0" />
        <span>List</span>
      </button>
    </Tooltip>
  );
}

export function VerticalListTab({
  active,
  savedViewLabel,
  onSelect,
}: ListTabProps) {
  return (
    <div className="shrink-0">
      <button
        aria-label={`Return to list: ${savedViewLabel}`}
        aria-selected={active}
        className={
          active
            ? "flex h-12 w-full items-center gap-2 bg-indigo-50 px-3 text-left text-indigo-700"
            : "flex h-12 w-full items-center gap-2 bg-slate-50 px-3 text-left hover:bg-indigo-50"
        }
        onClick={onSelect}
        role="tab"
        type="button"
      >
        <List aria-hidden="true" className="size-3.5 shrink-0" />
        <span className="min-w-0 flex-1 truncate font-semibold">List</span>
        <span className="inline-flex min-w-0 max-w-32 items-center gap-1 truncate rounded-md border border-current px-1.5 py-0.5 text-xs">
          <BriefcaseBusiness aria-hidden="true" className="size-3 shrink-0" />
          {savedViewLabel}
        </span>
      </button>
      <div className="h-px bg-slate-200" />
    </div>
  );
}
