import type { WorkspaceArticle } from "@/features/tickets/workspace-adapter";

export const avatarClass: Record<WorkspaceArticle["direction"], string> = {
  inbound: "bg-indigo-600 text-white",
  outbound: "bg-slate-950 text-white",
  internal: "bg-amber-600 text-white",
  system: "bg-slate-600 text-white",
  unknown: "bg-slate-600 text-white",
};

export const articleTypeLabel: Record<WorkspaceArticle["direction"], string> = {
  inbound: "Customer reply",
  outbound: "Agent reply",
  internal: "Internal comment",
  system: "System update",
  unknown: "Ticket article",
};

export const articleTypeTokenClass: Record<WorkspaceArticle["direction"], string> = {
  inbound: "rounded-md bg-indigo-50 px-2 py-0.5 font-medium text-indigo-700",
  outbound: "rounded-md bg-black px-2 py-0.5 font-medium text-white",
  internal: "rounded-md bg-amber-50 px-2 py-0.5 font-medium text-amber-700",
  system: "rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-600",
  unknown: "rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-600",
};

export const actionSelectedClass: Record<WorkspaceArticle["direction"], string> = {
  inbound: "bg-slate-100 text-slate-950 hover:bg-slate-100 active:bg-slate-100",
  outbound: "bg-slate-100 text-slate-950 hover:bg-slate-100 active:bg-slate-100",
  internal: "bg-slate-100 text-slate-950 hover:bg-slate-100 active:bg-slate-100",
  system: "bg-slate-100 text-slate-950 hover:bg-slate-100 active:bg-slate-100",
  unknown: "bg-slate-100 text-slate-950 hover:bg-slate-100 active:bg-slate-100",
};

export const actionStateClass: Record<WorkspaceArticle["direction"], string> = {
  inbound: "text-slate-600 hover:bg-slate-100 hover:text-slate-950 active:bg-slate-200",
  outbound: "text-slate-600 hover:bg-slate-100 hover:text-slate-950 active:bg-slate-200",
  internal: "text-slate-600 hover:bg-slate-100 hover:text-slate-950 active:bg-slate-200",
  system: "text-slate-600 hover:bg-slate-100 hover:text-slate-950 active:bg-slate-200",
  unknown: "text-slate-600 hover:bg-slate-100 hover:text-slate-950 active:bg-slate-200",
};
