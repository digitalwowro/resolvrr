import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TicketRichTextEditor } from "@/features/workspace/components/ticket-rich-text-editor";

describe("TicketRichTextEditor behavior", () => {
  it("sanitizes persisted html before assigning it to the editor DOM", () => {
    const onChange = vi.fn();

    render(
      <TicketRichTextEditor
        disabled={false}
        id="rich-restored-test"
        label="Reply"
        onChange={onChange}
        placeholder="Write a reply..."
        value={'<img src=x onerror="alert(1)"><p onclick="alert(2)">Safe</p><script>alert(3)</script>'}
      />,
    );

    const editor = screen.getByRole("textbox", { name: "Reply" });
    expect(editor.innerHTML).toBe("<p>Safe</p>");
    expect(editor.querySelector("img, script, [onerror], [onclick]")).toBeNull();
  });

  it("marks toolbar buttons active for the current editor selection", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const originalQueryCommandState = document.queryCommandState;
    Object.defineProperty(document, "queryCommandState", {
      configurable: true,
      value: vi.fn((command: string) =>
        command === "bold" || command === "insertUnorderedList",
      ),
    });

    try {
      render(
        <TicketRichTextEditor
          disabled={false}
          id="rich-test"
          label="Reply"
          onChange={onChange}
          placeholder="Write a reply..."
          value=""
        />,
      );

      const editor = screen.getByRole("textbox", { name: "Reply" });
      await user.type(editor, "Selected text");

      const range = document.createRange();
      range.selectNodeContents(editor);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      document.dispatchEvent(new Event("selectionchange"));

      await waitFor(() =>
        expect(screen.getByRole("button", { name: "Bold" })).toHaveAttribute(
          "aria-pressed",
          "true",
        ),
      );
      expect(screen.getByRole("button", { name: "Bulleted list" }))
        .toHaveAttribute("aria-pressed", "true");
      expect(screen.getByRole("button", { name: "Italic" }))
        .toHaveAttribute("aria-pressed", "false");
    } finally {
      if (originalQueryCommandState) {
        Object.defineProperty(document, "queryCommandState", {
          configurable: true,
          value: originalQueryCommandState,
        });
      } else {
        delete (document as Partial<Document>).queryCommandState;
      }
    }
  });

  it("does not mark underline active for a selected link without explicit underline", async () => {
    const onChange = vi.fn();
    const originalQueryCommandState = document.queryCommandState;
    Object.defineProperty(document, "queryCommandState", {
      configurable: true,
      value: vi.fn((command: string) => command === "underline"),
    });

    try {
      render(
        <TicketRichTextEditor
          disabled={false}
          id="rich-link-test"
          label="Reply"
          onChange={onChange}
          placeholder="Write a reply..."
          value='<a href="https://example.com">Docs</a>'
        />,
      );

      const editor = screen.getByRole("textbox", { name: "Reply" });
      const link = within(editor).getByRole("link", { name: "Docs" });
      const range = document.createRange();
      range.selectNodeContents(link);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      document.dispatchEvent(new Event("selectionchange"));

      await waitFor(() =>
        expect(screen.getByRole("button", { name: "Insert link" }))
          .toHaveAttribute("aria-pressed", "true"),
      );
      expect(screen.getByRole("button", { name: "Underline" }))
        .toHaveAttribute("aria-pressed", "false");
    } finally {
      if (originalQueryCommandState) {
        Object.defineProperty(document, "queryCommandState", {
          configurable: true,
          value: originalQueryCommandState,
        });
      } else {
        delete (document as Partial<Document>).queryCommandState;
      }
    }
  });

  it("clears sticky formatting when the rich editor becomes empty", () => {
    const onChange = vi.fn();
    const execCommand = vi.fn();
    const originalExecCommand = document.execCommand;
    const originalQueryCommandState = document.queryCommandState;
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: execCommand,
    });
    Object.defineProperty(document, "queryCommandState", {
      configurable: true,
      value: vi.fn((command: string) => command === "bold"),
    });

    try {
      render(
        <TicketRichTextEditor
          disabled={false}
          id="rich-empty-test"
          label="Reply"
          onChange={onChange}
          placeholder="Write a reply..."
          value="<strong>Word</strong>"
        />,
      );

      const editor = screen.getByRole("textbox", { name: "Reply" });
      editor.innerHTML = "";
      fireEvent.input(editor);

      expect(execCommand).toHaveBeenCalledWith("bold", false);
      expect(onChange).toHaveBeenLastCalledWith("");
      expect(editor.innerHTML).toBe("");
    } finally {
      if (originalExecCommand) {
        Object.defineProperty(document, "execCommand", {
          configurable: true,
          value: originalExecCommand,
        });
      } else {
        delete (document as Partial<Document>).execCommand;
      }
      if (originalQueryCommandState) {
        Object.defineProperty(document, "queryCommandState", {
          configurable: true,
          value: originalQueryCommandState,
        });
      } else {
        delete (document as Partial<Document>).queryCommandState;
      }
    }
  });

  it("preserves allowed rich formatting when pasting html", () => {
    const onChange = vi.fn();

    render(
      <TicketRichTextEditor
        disabled={false}
        id="rich-paste-test"
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
            ? '<div><strong>Bold</strong> <em>italic</em> <a href="https://example.com">link</a></div>'
            : "Bold italic link",
      },
    });

    expect(onChange).toHaveBeenLastCalledWith(
      '<p><strong>Bold</strong> <em>italic</em> <a href="https://example.com" rel="noreferrer noopener" target="_blank">link</a></p>',
    );
    expect(editor.innerHTML).toContain("<strong>Bold</strong>");
    expect(editor.innerHTML).toContain("<em>italic</em>");
    expect(editor.innerHTML).toContain('href="https://example.com"');
  });
});
