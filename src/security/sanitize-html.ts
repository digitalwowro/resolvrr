import sanitizeHtml from "sanitize-html";

const allowedTags = [
  "a",
  "blockquote",
  "br",
  "b",
  "code",
  "div",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "i",
  "li",
  "ol",
  "p",
  "pre",
  "s",
  "span",
  "strong",
  "sub",
  "sup",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "u",
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

function sanitizedComposerHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ["a", "br", "b", "em", "i", "li", "ol", "p", "strong", "u", "ul"],
    allowedAttributes: {
      a: ["href", "rel", "target"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        rel: "noreferrer noopener",
        target: "_blank",
      }),
      div: "p",
    },
  }).replace(/<a(?![^>]*\shref=)[^>]*>(.*?)<\/a>/giu, "$1");
}

export function sanitizeComposerHtml(html: string): string {
  return sanitizedComposerHtml(html).trim();
}

export function sanitizeComposerEditorHtml(html: string): string {
  return sanitizedComposerHtml(html);
}

export function sanitizeForwardedProviderHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [...allowedTags, "img"],
    allowedAttributes: {
      "*": ["style"],
      a: ["href", "name", "target", "rel", "style"],
      img: ["alt", "height", "src", "title", "width", "style"],
      td: ["colspan", "rowspan", "style"],
      th: ["colspan", "rowspan", "style"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: { img: ["data"] },
    allowedStyles: {
      "*": {
        color: [/^#[0-9a-f]{3,8}$/iu, /^rgba?\([\d\s,.%]+\)$/iu, /^[a-z]+$/iu],
        "background-color": [/^#[0-9a-f]{3,8}$/iu, /^rgba?\([\d\s,.%]+\)$/iu, /^[a-z]+$/iu],
        "font-family": [/^[\w\s,'"-]+$/u],
        "font-size": [/^\d+(?:\.\d+)?(?:px|pt|em|rem|%)$/u],
        "font-style": [/^(?:normal|italic|oblique)$/u],
        "font-weight": [/^(?:normal|bold|[1-9]00)$/u],
        "line-height": [/^\d+(?:\.\d+)?(?:px|pt|em|rem|%)?$/u],
        "text-align": [/^(?:left|right|center|justify)$/u],
        "text-decoration": [/^[\w\s-]+$/u],
        margin: [/^[\d\s.%a-z-]+$/iu],
        padding: [/^[\d\s.%a-z-]+$/iu],
      },
    },
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noreferrer noopener", target: "_blank" }),
      img: (tagName, attributes) => ({
        tagName,
        attribs: /^data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=]+$/iu.test(attributes.src ?? "")
          ? attributes
          : { alt: attributes.alt ?? "" },
      }),
    },
  }).trim();
}
