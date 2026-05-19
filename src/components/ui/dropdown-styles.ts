export const dropdownTriggerClass =
  "inline-flex h-9 min-w-40 items-center justify-between gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50";

export const dropdownMenuClass =
  "absolute z-50 mt-1 min-w-full max-w-xs rounded-md border border-slate-200 bg-white p-1 shadow-lg";

export const dropdownOptionClass =
  "flex h-8 w-full items-center gap-2 rounded px-2 text-left text-sm outline-none";

export const dropdownOptionStateClass = {
  idle: "text-slate-800",
  highlighted: "bg-indigo-50 text-indigo-950",
  selected: "font-medium text-indigo-700",
  disabled: "cursor-not-allowed text-slate-400",
};
