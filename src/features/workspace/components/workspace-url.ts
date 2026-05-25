export function ticketPath(ticketId?: string) {
  return ticketId ? `/workspace?ticket=${encodeURIComponent(ticketId)}` : "/workspace";
}

export function replaceWorkspaceUrl(ticketId?: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.history.replaceState(null, "", ticketPath(ticketId));
}
