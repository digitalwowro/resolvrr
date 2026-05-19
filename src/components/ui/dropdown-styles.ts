export const dropdownTriggerClass =
  "inline-flex h-9 max-w-full items-center justify-between gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-800 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50";

export const dropdownMenuClass =
  "absolute z-50 mt-1 w-max min-w-full max-w-sm rounded-md border border-slate-200 bg-white p-2";

export const dropdownOptionClass =
  "flex h-10 min-w-full items-center gap-2 rounded-md px-3 text-left text-sm outline-none";

export const dropdownOptionStateClass = {
  idle: "text-slate-800",
  highlighted: "bg-indigo-50 text-indigo-950",
  selected: "text-indigo-700",
  disabled: "cursor-not-allowed text-slate-400",
};
