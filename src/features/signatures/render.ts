import { createHash } from "node:crypto";
import type { TicketDetail } from "@/core/tickets";
import { sanitizeSignatureTemplateHtml } from "@/security/sanitize-html";
import type { WorkspaceSignatureUser } from "./repository";

export const workspaceSignatureVariables = [
  "user.displayName",
  "user.firstName",
  "user.lastName",
  "user.email",
  "workspace.name",
  "ticket.number",
  "ticket.title",
] as const;

function escapeHtml(value: string) {
  return value
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;")
    .replace(/"/gu, "&quot;");
}

export function renderWorkspaceSignatureTemplate(input: {
  templateHtml: string;
  ticket: TicketDetail["ticket"];
  user: WorkspaceSignatureUser;
  workspaceName: string;
}) {
  const values: Record<(typeof workspaceSignatureVariables)[number], string> = {
    "ticket.number": input.ticket.number,
    "ticket.title": input.ticket.title,
    "user.displayName": input.user.displayName ?? input.user.email,
    "user.email": input.user.email,
    "user.firstName": input.user.firstName ?? "",
    "user.lastName": input.user.lastName ?? "",
    "workspace.name": input.workspaceName,
  };
  const replaced = workspaceSignatureVariables.reduce(
    (html, variable) => html.replaceAll(`{{${variable}}}`, escapeHtml(values[variable])),
    input.templateHtml,
  );
  return sanitizeSignatureTemplateHtml(replaced);
}

export function signatureContextVersion(...values: string[]) {
  return createHash("sha256").update(values.join("\0")).digest("base64url");
}
