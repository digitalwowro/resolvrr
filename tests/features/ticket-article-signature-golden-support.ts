import type {
  TicketArticleProviderContainerSignatureHint,
} from "@/core/ticket-article-signatures";
import type {
  ArticleBodyHiddenKind,
} from "@/features/workspace/components/ticket-article-body-trim";

export const providerContainerStart =
  "<!--provider-signature-container:start-->";
export const providerContainerEnd =
  "<!--provider-signature-container:end-->";

export type GoldenProviderContainerHint =
  TicketArticleProviderContainerSignatureHint;

export type SignatureGoldenFixture = {
  expected: {
    collapsed: boolean;
    hiddenContains?: string[];
    hiddenKind?: ArticleBodyHiddenKind;
    visibleContains: string[];
  };
  hint?: "provider-container";
  html: string;
  name: string;
};

export function materializeSignatureGoldenFixture(
  fixture: SignatureGoldenFixture,
): { hint?: GoldenProviderContainerHint; html: string } {
  if (!fixture.hint) return { html: fixture.html.trim() };
  const start = fixture.html.indexOf(providerContainerStart);
  const end = fixture.html.indexOf(providerContainerEnd);
  if (start < 0 || end < start) {
    throw new Error(`Invalid provider container fixture: ${fixture.name}`);
  }
  const htmlWithoutMarkers = fixture.html
    .replace(providerContainerStart, "")
    .replace(providerContainerEnd, "");
  const leadingWhitespace =
    htmlWithoutMarkers.length - htmlWithoutMarkers.trimStart().length;
  return {
    html: htmlWithoutMarkers.trim(),
    hint: {
      kind: "provider-container",
      startOffset: start - leadingWhitespace,
      endOffset: end - providerContainerStart.length - leadingWhitespace,
    },
  };
}
