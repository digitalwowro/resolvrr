export const dropdownTriggerClass =
  "inline-flex h-9 max-w-full items-center justify-between gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-800 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50";

export const dropdownMenuClass =
  "absolute z-50 mt-1 w-max min-w-full max-w-sm rounded-md border border-slate-200 bg-white p-1 shadow-lg";

export const dropdownOptionClass =
  "flex h-8 min-w-full items-center gap-2 rounded-md px-2 text-left text-sm outline-none hover:bg-indigo-50 hover:text-indigo-950";

export const dropdownOptionStateClass = {
  idle: "text-slate-800",
  highlighted: "bg-indigo-50 text-indigo-950",
  selected: "bg-transparent text-indigo-700 hover:bg-transparent hover:text-indigo-700",
  disabled: "cursor-not-allowed text-slate-400",
};
