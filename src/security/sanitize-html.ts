import sanitizeHtml from "sanitize-html";

const allowedTags = [
  "a",
  "blockquote",
  "br",
  "code",
  "div",
  "em",
  "li",
  "ol",
  "p",
  "pre",
  "span",
  "strong",
  "ul",
];

export function sanitizeProviderHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags,
    allowedAttributes: {
      a: ["href", "name", "target", "rel"],
      span: ["class"],
      div: ["class"],
      p: ["class"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        rel: "noreferrer noopener",
        target: "_blank",
      }),
    },
  });
}
