import sanitizeHtml from "sanitize-html";

export type ProviderHtmlSanitizationOptions = {
  rewriteImageSource?(source: string): string | undefined;
};

const allowedTags = [
  "a",
  "address",
  "blockquote",
  "br",
  "b",
  "code",
  "div",
  "em",
  "footer",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "i",
  "img",
  "li",
  "ol",
  "p",
  "pre",
  "s",
  "section",
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

const safeColor = /^(?:#[0-9a-f]{3,8}|rgba?\([\d\s,.%]+\)|[a-z]+)(?:\s*!important)?$/iu;
const safeLength = /^(?:0|auto|\d+(?:\.\d+)?(?:px|pt|em|rem|%|vh|vw))(?:\s*!important)?$/iu;
const safeSignedLength = /^(?:0|auto|-?\d+(?:\.\d+)?(?:px|pt|em|rem|%|vh|vw))(?:\s*!important)?$/iu;
const safeSpacing = /^(?:0|auto|-?\d+(?:\.\d+)?(?:px|pt|em|rem|%))(?:\s+(?:0|auto|-?\d+(?:\.\d+)?(?:px|pt|em|rem|%))){0,3}(?:\s*!important)?$/iu;
const safeBorder = /^(?:0|none|\d+(?:\.\d+)?(?:px|pt)?|\d+(?:\.\d+)?(?:px|pt)\s+(?:none|solid|dashed|dotted|double)\s+(?:#[0-9a-f]{3,8}|rgba?\([\d\s,.%]+\)|[a-z]+))(?:\s*!important)?$/iu;

const emailAllowedStyles: sanitizeHtml.IOptions["allowedStyles"] = {
  "*": {
    "background-color": [safeColor],
    border: [safeBorder],
    "border-bottom": [safeBorder],
    "border-collapse": [/^(?:collapse|separate)(?:\s*!important)?$/iu],
    "border-left": [safeBorder],
    "border-right": [safeBorder],
    "border-spacing": [safeSpacing],
    "border-top": [safeBorder],
    "box-sizing": [/^(?:border-box|content-box)(?:\s*!important)?$/iu],
    clear: [/^(?:none|left|right|both)(?:\s*!important)?$/iu],
    color: [safeColor],
    direction: [/^(?:ltr|rtl)(?:\s*!important)?$/iu],
    display: [
      /^(?:none|block|inline|inline-block|table|table-row|table-cell)(?:\s*!important)?$/iu,
    ],
    float: [/^(?:none|left|right)(?:\s*!important)?$/iu],
    "font-family": [/^[\w\s,'"-]+(?:\s*!important)?$/u],
    "font-size": [safeLength],
    "font-style": [/^(?:normal|italic|oblique)(?:\s*!important)?$/iu],
    "font-weight": [/^(?:normal|bold|[1-9]00)(?:\s*!important)?$/iu],
    height: [safeLength],
    "letter-spacing": [safeSignedLength],
    "line-height": [/^(?:normal|\d+(?:\.\d+)?(?:px|pt|em|rem|%)?)(?:\s*!important)?$/iu],
    margin: [safeSpacing],
    "margin-bottom": [safeSignedLength],
    "margin-left": [safeSignedLength],
    "margin-right": [safeSignedLength],
    "margin-top": [safeSignedLength],
    "max-height": [safeLength],
    "max-width": [safeLength],
    "min-height": [safeLength],
    "min-width": [safeLength],
    overflow: [/^(?:visible|hidden|auto)(?:\s*!important)?$/iu],
    "overflow-wrap": [/^(?:normal|break-word|anywhere)(?:\s*!important)?$/iu],
    padding: [safeSpacing],
    "padding-bottom": [safeLength],
    "padding-left": [safeLength],
    "padding-right": [safeLength],
    "padding-top": [safeLength],
    "text-align": [/^(?:left|right|center|justify|start|end)(?:\s*!important)?$/iu],
    "text-decoration": [/^(?:none|underline|line-through)(?:\s*!important)?$/iu],
    "text-indent": [safeSignedLength],
    "text-transform": [/^(?:none|uppercase|lowercase|capitalize)(?:\s*!important)?$/iu],
    "table-layout": [/^(?:auto|fixed)(?:\s*!important)?$/iu],
    "vertical-align": [
      /^(?:baseline|top|middle|bottom|text-top|text-bottom|sub|super)(?:\s*!important)?$/iu,
      safeSignedLength,
    ],
    "white-space": [/^(?:normal|nowrap|pre|pre-wrap|pre-line)(?:\s*!important)?$/iu],
    width: [safeLength],
    "word-break": [/^(?:normal|break-all|keep-all|break-word)(?:\s*!important)?$/iu],
  },
};

export function sanitizeProviderHtml(
  html: string,
  options: ProviderHtmlSanitizationOptions = {},
): string {
  return sanitizeHtml(html, {
    allowedTags,
    allowedAttributes: {
      "*": ["dir", "style"],
      a: ["href", "name", "target", "rel"],
      span: ["class"],
      div: ["class"],
      p: ["class"],
      img: ["alt", "height", "src", "title", "width"],
      table: ["align", "bgcolor", "border", "cellpadding", "cellspacing", "height", "role", "width"],
      tbody: ["align", "valign"],
      td: ["align", "bgcolor", "colspan", "height", "rowspan", "valign", "width"],
      th: ["align", "bgcolor", "colspan", "height", "rowspan", "valign", "width"],
      tr: ["align", "bgcolor", "valign"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedStyles: emailAllowedStyles,
    exclusiveFilter: (frame) => frame.tag === "img" && !frame.attribs.src,
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        rel: "noreferrer noopener",
        target: "_blank",
      }),
      img: (tagName, attributes) => {
        const source = options.rewriteImageSource?.(attributes.src ?? "");
        const attribs: Record<string, string> = source
          ? { ...attributes, src: source }
          : { alt: attributes.alt ?? "" };
        return {
          tagName,
          attribs,
        };
      },
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
    allowedStyles: emailAllowedStyles,
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
