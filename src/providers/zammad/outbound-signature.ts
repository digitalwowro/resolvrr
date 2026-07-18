import type { ResolvedTicketSignature } from "@/core/ticket-signatures";

function escapeHtml(value: string): string {
  return value
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;")
    .replace(/"/gu, "&quot;");
}

export function zammadOutboundSignatureHtml(
  signature: ResolvedTicketSignature | undefined,
): string {
  const renderedHtml = signature?.renderedHtml?.trim();
  return renderedHtml
    ? `<div><br></div><div class="js-signatureMarker">${renderedHtml}</div>`
    : "";
}

export function zammadOutboundBody(input: {
  body: string;
  bodyFormat?: "plain" | "html";
  conversationHistoryHtml?: string;
  signature?: ResolvedTicketSignature;
}): { body: string; contentType: "text/html" | "text/plain" } {
  const body = input.body.trim();
  const signatureHtml = zammadOutboundSignatureHtml(input.signature);
  const conversationHistoryHtml = input.conversationHistoryHtml ?? "";
  if (!signatureHtml && !conversationHistoryHtml) {
    return {
      body,
      contentType: input.bodyFormat === "html" ? "text/html" : "text/plain",
    };
  }
  const messageHtml = input.bodyFormat === "html"
    ? body
    : `<p>${escapeHtml(body).replace(/\n/gu, "<br>")}</p>`;
  return {
    body: `${messageHtml}${signatureHtml}${conversationHistoryHtml}`,
    contentType: "text/html",
  };
}
