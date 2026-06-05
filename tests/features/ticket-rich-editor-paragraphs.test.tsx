import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TicketRichTextEditor } from "@/features/workspace/components/ticket-rich-text-editor";

describe("TicketRichTextEditor behavior", () => {
  it("normalizes div blocks to paragraphs while line breaks remain tight", () => {
    const onChange = vi.fn();

    render(
      <TicketRichTextEditor
        disabled={false}
        id="rich-paragraph-test"
        label="Reply"
        onChange={onChange}
        placeholder="Write a reply..."
        value="<p>First paragraph</p><div>Second paragraph<br>same paragraph</div>"
      />,
    );

    const editor = screen.getByRole("textbox", { name: "Reply" });
    expect(editor.innerHTML).toBe(
      "<p>First paragraph</p><p>Second paragraph<br>same paragraph</p>",
    );
    expect(editor).toHaveClass("[&_p]:mb-2");
    expect(editor).toHaveClass("[&_p:last-child]:mb-0");
    expect(editor).toHaveClass("[&_br]:block");
  });

  it("uses paragraphs for Enter and br for Shift+Enter", () => {
    const onChange = vi.fn();
    const originalExecCommand = document.execCommand;
    const execCommand = vi.fn(
      (command: string, _showUi?: boolean, value?: string) => {
        if (command === "defaultParagraphSeparator") {
          expect(value).toBe("p");
          return true;
        }
        return command === "insertParagraph" || command === "insertLineBreak";
      },
    );
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: execCommand,
    });

    try {
      render(
        <TicketRichTextEditor
          disabled={false}
          id="rich-enter-test"
          label="Reply"
          onChange={onChange}
          placeholder="Write a reply..."
          value="<p>Active line</p>"
        />,
      );

      const editor = screen.getByRole("textbox", { name: "Reply" });
      fireEvent.keyDown(editor, { key: "Enter" });
      fireEvent.keyDown(editor, { key: "Enter", shiftKey: true });

      expect(execCommand).toHaveBeenCalledWith(
        "defaultParagraphSeparator",
        false,
        "p",
      );
      expect(execCommand).toHaveBeenCalledWith("insertParagraph", false);
      expect(execCommand).toHaveBeenCalledWith("insertLineBreak", false);
    } finally {
      if (originalExecCommand) {
        Object.defineProperty(document, "execCommand", {
          configurable: true,
          value: originalExecCommand,
        });
      } else {
        delete (document as Partial<Document>).execCommand;
      }
    }
  });

  it("wraps bare editor text in paragraphs on the first Enter", () => {
    const onChange = vi.fn();

    render(
      <TicketRichTextEditor
        disabled={false}
        id="rich-bare-enter-test"
        label="Reply"
        onChange={onChange}
        placeholder="Write a reply..."
        value=""
      />,
    );

    const editor = screen.getByRole("textbox", { name: "Reply" });
    editor.textContent = "First paragraph";
    const textNode = editor.firstChild;
    expect(textNode).toBeInstanceOf(Text);

    const range = document.createRange();
    range.setStart(textNode as Text, "First paragraph".length);
    range.collapse(true);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    fireEvent.keyDown(editor, { key: "Enter" });

    expect(editor.innerHTML).toBe("<p>First paragraph</p><p><br></p>");
    expect(onChange).toHaveBeenLastCalledWith(
      "<p>First paragraph</p><p><br></p>",
    );
  });

  it("strips unsafe pasted html before inserting it", () => {
    const onChange = vi.fn();

    render(
      <TicketRichTextEditor
        disabled={false}
        id="rich-unsafe-paste-test"
        label="Reply"
        onChange={onChange}
        placeholder="Write a reply..."
        value=""
      />,
    );

    const editor = screen.getByRole("textbox", { name: "Reply" });
    fireEvent.paste(editor, {
      clipboardData: {
        getData: (type: string) =>
          type === "text/html"
            ? '<p><script>alert(1)</script><span style="color:red">Hello</span> <a href="javascript:alert(1)">bad</a></p>'
            : "Hello bad",
      },
    });

    expect(editor.innerHTML).toBe("<p>Hello bad</p>");
    expect(onChange).toHaveBeenLastCalledWith("<p>Hello bad</p>");
  });
});
