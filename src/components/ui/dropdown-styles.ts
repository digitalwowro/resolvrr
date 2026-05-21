export const dropdownTriggerClass =
  "inline-flex h-9 max-w-full items-center justify-between gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-800 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50";

export const dropdownMenuClass =
  "absolute z-50 mt-1 box-border max-w-sm rounded-md border border-slate-200 bg-white p-1 text-sm shadow-lg";

export const dropdownOptionClass =
  "flex h-8 w-full items-center gap-2 rounded-md border border-transparent px-2 text-left outline-none hover:border-slate-200 hover:bg-indigo-50 hover:text-indigo-950";

export const dropdownMeasureRootClass =
  "pointer-events-none invisible col-start-1 row-start-1 grid text-sm";

export const dropdownMeasureMenuFrameClass =
  "col-start-1 row-start-1 h-0 overflow-hidden";

export const dropdownMeasureMenuClass =
  "inline-flex flex-col items-stretch gap-1 rounded-md border border-slate-200 p-1";

export const dropdownMeasureOptionClass =
  "inline-flex h-8 w-max items-center gap-2 whitespace-nowrap rounded-md border border-transparent px-2 text-left";

export const dropdownIconClass = "size-[1em] shrink-0";

export const dropdownOptionStateClass = {
  idle: "text-slate-800",
  highlighted: "bg-indigo-50 text-indigo-700",
  selected: "bg-transparent text-indigo-700 hover:bg-transparent hover:text-indigo-700",
  disabled: "cursor-not-allowed text-slate-400",
};
