import { describe, expect, it } from "vitest";
import {
  applyEditorRewriteSelection,
  captureEditorRewriteSelection,
  captureEditorRewriteTarget,
} from "@/features/workspace/components/ticket-rich-text-editor-selection";

function selectText(node: Text, start: number, end: number) {
  const range = document.createRange();
  range.setStart(node, start);
  range.setEnd(node, end);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

function selectRange(
  startNode: Node,
  startOffset: number,
  endNode: Node,
  endOffset: number,
) {
  const range = document.createRange();
  range.setStart(startNode, startOffset);
  range.setEnd(endNode, endOffset);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

describe("ticket rich-text editor rewrite selections", () => {
  it("replaces selected formatted text without replacing surrounding content", () => {
    const editor = document.createElement("div");
    editor.innerHTML =
      '<p>Hello <strong>bad words</strong> tail <a href="https://example.com">link</a></p>';
    document.body.append(editor);
    const selectedNode = editor.querySelector("strong")?.firstChild;
    expect(selectedNode).toBeInstanceOf(Text);
    selectText(selectedNode as Text, 0, "bad words".length);

    const snapshot = captureEditorRewriteSelection(editor);
    expect(snapshot).not.toBeNull();
    expect(snapshot).not.toBe("unsupported-selection");
    window.getSelection()?.removeAllRanges();

    const result = applyEditorRewriteSelection(
      editor,
      snapshot as Exclude<typeof snapshot, null | "unsupported-selection">,
      "better words",
    );

    expect(result.status).toBe("applied");
    expect(editor.querySelector("strong")).toHaveTextContent("better words");
    expect(editor).toHaveTextContent("Hello better words tail link");
    expect(editor.querySelector("a")).toHaveAttribute(
      "href",
      "https://example.com",
    );
  });

  it("keeps a captured selection when toolbar focus clears the DOM selection", () => {
    const editor = document.createElement("div");
    editor.innerHTML = "<p>Keep selected words available.</p>";
    document.body.append(editor);
    const text = editor.querySelector("p")?.firstChild as Text;
    selectText(text, 5, 19);
    const remembered = captureEditorRewriteSelection(editor);
    window.getSelection()?.removeAllRanges();

    const captured = captureEditorRewriteTarget(editor, remembered);

    expect(captured).toMatchObject({
      status: "available",
      target: { kind: "selection" },
    });
  });

  it("preserves list and link structure around a selected rewrite", () => {
    const editor = document.createElement("div");
    editor.innerHTML =
      '<ul><li><a href="https://example.com">unclear link</a></li><li>Keep item</li></ul>';
    document.body.append(editor);
    const linkText = editor.querySelector("a")?.firstChild as Text;
    selectText(linkText, 0, "unclear link".length);
    const snapshot = captureEditorRewriteSelection(editor);

    const result = applyEditorRewriteSelection(
      editor,
      snapshot as Exclude<typeof snapshot, null | "unsupported-selection">,
      "clear link",
    );

    expect(result.status).toBe("applied");
    expect(editor.querySelectorAll("li")).toHaveLength(2);
    expect(editor.querySelector("a")).toHaveTextContent("clear link");
    expect(editor.querySelector("a")).toHaveAttribute(
      "href",
      "https://example.com",
    );
    expect(editor.querySelectorAll("li")[1]).toHaveTextContent("Keep item");
  });

  it("keeps the following paragraph separate when selection includes its leading boundary", () => {
    const editor = document.createElement("div");
    editor.innerHTML =
      "<p>First sentence.</p><p>Middle sentence.</p><p>Last sentence.</p>";
    document.body.append(editor);
    const paragraphs = editor.querySelectorAll("p");
    const middle = paragraphs[1]?.firstChild as Text;
    const last = paragraphs[2]?.firstChild as Text;
    selectRange(middle, 0, last, 0);
    const snapshot = captureEditorRewriteSelection(editor);

    expect(snapshot).toMatchObject({ selectedText: "Middle sentence." });
    const result = applyEditorRewriteSelection(
      editor,
      snapshot as Exclude<typeof snapshot, null | "unsupported-selection">,
      "Rephrased middle sentence.",
    );

    expect(result.status).toBe("applied");
    expect(editor.querySelectorAll("p")).toHaveLength(3);
    expect(editor.querySelectorAll("p")[1]).toHaveTextContent(
      "Rephrased middle sentence.",
    );
    expect(editor.querySelectorAll("p")[2]).toHaveTextContent("Last sentence.");
  });

  it("keeps the preceding paragraph separate when selection includes its trailing boundary", () => {
    const editor = document.createElement("div");
    editor.innerHTML =
      "<p>First sentence.</p><p>Middle sentence.</p><p>Last sentence.</p>";
    document.body.append(editor);
    const paragraphs = editor.querySelectorAll("p");
    const first = paragraphs[0]?.firstChild as Text;
    const middle = paragraphs[1]?.firstChild as Text;
    selectRange(
      first,
      first.textContent?.length ?? 0,
      middle,
      middle.textContent?.length ?? 0,
    );
    const snapshot = captureEditorRewriteSelection(editor);

    expect(snapshot).toMatchObject({ selectedText: "Middle sentence." });
    const result = applyEditorRewriteSelection(
      editor,
      snapshot as Exclude<typeof snapshot, null | "unsupported-selection">,
      "Rephrased middle sentence.",
    );

    expect(result.status).toBe("applied");
    expect(editor.querySelectorAll("p")).toHaveLength(3);
    expect(editor.querySelectorAll("p")[0]).toHaveTextContent("First sentence.");
    expect(editor.querySelectorAll("p")[1]).toHaveTextContent(
      "Rephrased middle sentence.",
    );
  });

  it("preserves the paragraph wrapper for a whole-block browser selection", () => {
    const editor = document.createElement("div");
    editor.innerHTML =
      "<p>First sentence.</p><p>Middle sentence.</p><p>Last sentence.</p>";
    document.body.append(editor);
    selectRange(editor, 1, editor, 2);
    const snapshot = captureEditorRewriteSelection(editor);

    const result = applyEditorRewriteSelection(
      editor,
      snapshot as Exclude<typeof snapshot, null | "unsupported-selection">,
      "Rephrased middle sentence.",
    );

    expect(result.status).toBe("applied");
    expect(editor.querySelectorAll("p")).toHaveLength(3);
    expect(editor.querySelectorAll("p")[1]).toHaveTextContent(
      "Rephrased middle sentence.",
    );
    expect(editor.querySelectorAll("p")[2]).toHaveTextContent("Last sentence.");
  });

  it("fails closed when the editor changed after selection capture", () => {
    const editor = document.createElement("div");
    editor.innerHTML = "<p>Original selection.</p>";
    document.body.append(editor);
    const text = editor.querySelector("p")?.firstChild as Text;
    selectText(text, 0, "Original".length);
    const snapshot = captureEditorRewriteSelection(editor);
    editor.innerHTML = "<p>Different selection.</p>";

    const result = applyEditorRewriteSelection(
      editor,
      snapshot as Exclude<typeof snapshot, null | "unsupported-selection">,
      "Replacement",
    );

    expect(result).toEqual({ status: "stale" });
    expect(editor).toHaveTextContent("Different selection.");
  });

  it("rejects selections that intersect a non-editable mention", () => {
    const editor = document.createElement("div");
    editor.innerHTML =
      '<p>Hello <span data-resolvrr-mention-id="agent-1" contenteditable="false">@@Agent</span></p>';
    document.body.append(editor);
    const mentionText = editor.querySelector("span")?.firstChild as Text;
    selectText(mentionText, 0, "@@Agent".length);

    expect(captureEditorRewriteSelection(editor)).toBe(
      "unsupported-selection",
    );
  });
});
