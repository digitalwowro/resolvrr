import type { WorkspaceArticle } from "@/features/tickets/workspace-adapter";

export const articleClass: Record<WorkspaceArticle["direction"], string> = {
  inbound:
    "relative border-indigo-200 bg-indigo-50/90 shadow-sm before:pointer-events-none before:absolute before:inset-y-0 before:left-0 before:z-10 before:w-1 before:bg-indigo-500 before:content-['']",
  outbound:
    "relative border-slate-300 bg-white before:pointer-events-none before:absolute before:inset-y-0 before:left-0 before:z-10 before:w-1 before:bg-slate-800 before:content-['']",
  internal:
    "relative border-amber-200 bg-amber-50/70 before:pointer-events-none before:absolute before:inset-y-0 before:left-0 before:z-10 before:w-1 before:bg-amber-500 before:content-['']",
  system: "border-slate-200 bg-slate-50/40",
  unknown: "border-slate-200 bg-slate-50/40",
};

export const avatarClass: Record<WorkspaceArticle["direction"], string> = {
  inbound: "bg-indigo-600 text-white",
  outbound: "bg-slate-950 text-white",
  internal: "bg-amber-600 text-white",
  system: "bg-slate-600 text-white",
  unknown: "bg-slate-600 text-white",
};

export const articleTypeLabel: Record<WorkspaceArticle["direction"], string> = {
  inbound: "Customer reply",
  outbound: "Employee reply",
  internal: "Internal note",
  system: "System update",
  unknown: "Ticket article",
};

export const actionSelectedClass: Record<WorkspaceArticle["direction"], string> = {
  inbound: "bg-indigo-200 hover:bg-indigo-200 active:bg-indigo-200",
  outbound: "bg-slate-300 hover:bg-slate-300 active:bg-slate-300",
  internal: "bg-amber-200 hover:bg-amber-200 active:bg-amber-200",
  system: "bg-slate-200 hover:bg-slate-200 active:bg-slate-200",
  unknown: "bg-slate-200 hover:bg-slate-200 active:bg-slate-200",
};

export const actionStateClass: Record<WorkspaceArticle["direction"], string> = {
  inbound: "hover:bg-indigo-100 active:bg-indigo-200",
  outbound: "hover:bg-slate-200 active:bg-slate-300",
  internal: "hover:bg-amber-100 active:bg-amber-200",
  system: "hover:bg-slate-100 active:bg-slate-200",
  unknown: "hover:bg-slate-100 active:bg-slate-200",
};

export const actionBorderClass: Record<WorkspaceArticle["direction"], string> = {
  inbound: "border-indigo-200",
  outbound: "border-slate-300",
  internal: "border-amber-200",
  system: "border-slate-200",
  unknown: "border-slate-200",
};

export const actionSurfaceClass: Record<WorkspaceArticle["direction"], string> = {
  inbound: "bg-indigo-100/60",
  outbound: "bg-slate-100/80",
  internal: "bg-amber-100/60",
  system: "bg-slate-100/60",
  unknown: "bg-slate-100/60",
};

export const composerPanelClass: Record<WorkspaceArticle["direction"], string> = {
  inbound: "border-indigo-200",
  outbound: "border-slate-300",
  internal: "border-amber-200",
  system: "border-slate-200",
  unknown: "border-slate-200",
};
