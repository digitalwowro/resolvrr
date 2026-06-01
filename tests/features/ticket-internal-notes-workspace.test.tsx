import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  defaultWorkspaceTicketColumns,
  type LoadWorkspaceTicketDetailAction,
  type SelectedTicketUpdatePayload,
  type TicketMetadataMutationActionState,
  type WorkspaceArticle,
  type WorkspaceTicketDetailLoadResult,
} from "@/features/tickets";
import { TicketWorkspace } from "@/features/workspace/components/ticket-workspace";
import { TicketRichTextEditor } from "@/features/workspace/components/ticket-rich-text-editor";
import {
  availableList,
  detailPropsFor,
  noopAction,
  noopMutationAction,
  row,
  selectedDetailProps,
} from "./ticket-workspace-test-utils";

const routerPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPush,
    refresh: vi.fn(),
  }),
}));

type MutationAction = (
  request: SelectedTicketUpdatePayload,
) => Promise<TicketMetadataMutationActionState>;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((innerResolve) => {
    resolve = innerResolve;
  });
  return { promise, resolve };
}

function renderWorkspace({
  articles,
  customerReplies = false,
  internalNotes = false,
  updateTicketMetadataAction = noopMutationAction,
  loadTicketDetailAction,
}: {
  articles?: WorkspaceArticle[];
  customerReplies?: boolean;
  internalNotes?: boolean;
  loadTicketDetailAction?: LoadWorkspaceTicketDetailAction;
  updateTicketMetadataAction?: MutationAction;
} = {}) {
  const detailProps = selectedDetailProps();
  const detail = articles ? { ...detailProps.detail, articles } : detailProps.detail;

  render(
    <TicketWorkspace
      columns={defaultWorkspaceTicketColumns}
      connections={[{ id: "connection-1", label: "Support", active: true }]}
      detail={detail}
      detailResult={{ status: "available", detail }}
      listResult={{
        ...availableList,
        communicationCapabilities: { customerReplies, internalNotes },
      }}
      loadTicketDetailAction={loadTicketDetailAction}
      logoutAction={noopAction}
      rows={[row]}
      selectedTicketId="ticket-1"
      setActiveConnectionAction={noopAction}
      tabs={[{ ...row }]}
      updateTicketMetadataAction={updateTicketMetadataAction}
      userEmail="agent@example.com"
    />,
  );
}

function internalArticle(): WorkspaceArticle {
  return {
    id: "article-internal-ticket-1",
    author: "Agent Smith",
    authorEmail: "agent@example.com",
    from: { label: "Agent Smith", email: "agent@example.com" },
    to: [],
    cc: [],
    bcc: [],
    direction: "internal",
    meta: "May 24, 08:34",
    sanitizedHtml: "<p>Private investigation note.</p>",
    visibility: "internal",
    attachments: [],
  };
}

function getCustomerArticle() {
  return screen.getByRole("article", {
    name: "Customer reply from Maya Patel",
  });
}

describe("TicketWorkspace inline communication composers", () => {
  beforeEach(() => {
    routerPush.mockClear();
  });

  it("does not render standalone bottom composers by default", () => {
    renderWorkspace({ customerReplies: true, internalNotes: true });

    expect(
      screen.queryByRole("form", { name: "Reply composer for Maya Patel" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("form", { name: "Comment composer for Maya Patel" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Customer reply")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Internal note")).not.toBeInTheDocument();
  });

  it("opens an inline reply composer from a public article", async () => {
    const user = userEvent.setup();
    const scrollIntoView = vi.fn();
    const htmlElementPrototype: {
      scrollIntoView?: HTMLElement["scrollIntoView"];
    } = window.HTMLElement.prototype;
    const originalScrollIntoView = htmlElementPrototype.scrollIntoView;
    htmlElementPrototype.scrollIntoView =
      scrollIntoView as unknown as HTMLElement["scrollIntoView"];

    try {
      renderWorkspace({ customerReplies: true, internalNotes: true });
      const article = getCustomerArticle();

      await user.click(within(article).getByRole("button", { name: "Reply" }));
      const editor = within(article).getByRole("textbox", { name: "Reply" });

      expect(
        within(article).getByRole("form", {
          name: "Reply composer for Maya Patel",
        }),
      ).toBeInTheDocument();
      expect(editor).toHaveFocus();
      await waitFor(() =>
        expect(scrollIntoView).toHaveBeenCalledWith({
          block: "center",
          inline: "nearest",
          behavior: "smooth",
        }),
      );
      expect(within(article).getByRole("button", { name: "Reply" })).toHaveClass(
        "bg-indigo-200",
      );
      expect(
        within(article).getByRole("button", { name: "Reply all" }),
      ).toBeDisabled();
    } finally {
      if (originalScrollIntoView) {
        htmlElementPrototype.scrollIntoView = originalScrollIntoView;
      } else {
        delete htmlElementPrototype.scrollIntoView;
      }
    }
  });

  it("hides the inline reply composer from the editor toolbar", async () => {
    const user = userEvent.setup();

    renderWorkspace({ customerReplies: true, internalNotes: true });
    const article = getCustomerArticle();

    await user.click(within(article).getByRole("button", { name: "Reply" }));
    expect(
      within(article).getByRole("form", {
        name: "Reply composer for Maya Patel",
      }),
    ).toBeInTheDocument();

    await user.click(within(article).getByRole("button", { name: "Close editor" }));

    expect(
      within(article).queryByRole("form", {
        name: "Reply composer for Maya Patel",
      }),
    ).not.toBeInTheDocument();
    expect(within(article).getByRole("button", { name: "Reply" }))
      .not.toHaveClass("bg-indigo-200");
  });

  it("stages a reply and sends it through workspace Update", async () => {
    const user = userEvent.setup();
    const updateTicketMetadataAction = vi.fn<MutationAction>(async () => ({
      status: "saved",
      field: "communication",
      message: "Saved.",
    }));

    renderWorkspace({
      customerReplies: true,
      updateTicketMetadataAction,
    });

    const article = getCustomerArticle();
    await user.click(within(article).getByRole("button", { name: "Reply" }));
    await user.type(
      within(article).getByRole("textbox", { name: "Reply" }),
      "Thanks for the report.",
    );
    expect(within(article).queryByRole("button", { name: "Send" }))
      .not.toBeInTheDocument();
    expect(updateTicketMetadataAction).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Update" }));

    expect(updateTicketMetadataAction).toHaveBeenCalledWith({
      communication: {
        bodyFormat: "html",
        replyBody: "Thanks for the report.",
      },
      ticketExternalId: "ticket-1",
    });
    await waitFor(() =>
      expect(
        within(article).queryByRole("form", {
          name: "Reply composer for Maya Patel",
        }),
      ).not.toBeInTheDocument(),
    );
  });

  it("keeps the existing thread visible while refreshing a saved reply", async () => {
    const user = userEvent.setup();
    const updateTicketMetadataAction = vi.fn<MutationAction>(async () => ({
      status: "saved",
      field: "communication",
      message: "Saved.",
    }));
    const refreshed = detailPropsFor(row, "Thanks for the report.");
    const refreshResult = deferred<WorkspaceTicketDetailLoadResult>();
    const loadTicketDetailAction = vi.fn<LoadWorkspaceTicketDetailAction>(
      () => refreshResult.promise,
    );

    renderWorkspace({
      customerReplies: true,
      loadTicketDetailAction,
      updateTicketMetadataAction,
    });

    const article = getCustomerArticle();
    await user.click(within(article).getByRole("button", { name: "Reply" }));
    await user.type(
      within(article).getByRole("textbox", { name: "Reply" }),
      "Thanks for the report.",
    );
    await user.click(screen.getByRole("button", { name: "Update" }));

    await waitFor(() =>
      expect(loadTicketDetailAction).toHaveBeenCalledWith("ticket-1"),
    );
    expect(screen.queryByText("Loading ticket thread...")).not.toBeInTheDocument();
    expect(getCustomerArticle()).toBeInTheDocument();

    refreshResult.resolve({ status: "available", detail: refreshed.detail });
    expect(await screen.findByText("Thanks for the report.")).toBeInTheDocument();
  });

  it("hides the reply editor and scrolls to the refreshed reply after Update", async () => {
    const user = userEvent.setup();
    const scrollIntoView = vi.fn();
    const htmlElementPrototype: {
      scrollIntoView?: HTMLElement["scrollIntoView"];
    } = window.HTMLElement.prototype;
    const originalScrollIntoView = htmlElementPrototype.scrollIntoView;
    htmlElementPrototype.scrollIntoView =
      scrollIntoView as unknown as HTMLElement["scrollIntoView"];
    const updateTicketMetadataAction = vi.fn<MutationAction>(async () => ({
      status: "saved",
      field: "communication",
      message: "Saved.",
    }));
    const refreshed = detailPropsFor(row, "Thanks for the report.");
    refreshed.detail.articles = [
      ...selectedDetailProps().detail.articles,
      {
        id: "article-reply-ticket-1",
        author: "Agent Smith",
        authorEmail: "agent@example.com",
        from: { label: "Agent Smith", email: "agent@example.com" },
        to: [{ label: "Maya Patel", email: "maya@example.com" }],
        cc: [],
        bcc: [],
        direction: "outbound",
        meta: "May 24, 08:40",
        sanitizedHtml: "<p>Thanks for the report.</p>",
        visibility: "public",
        attachments: [],
      },
    ];
    const loadTicketDetailAction = vi.fn<LoadWorkspaceTicketDetailAction>(
      async () => ({ status: "available", detail: refreshed.detail }),
    );

    try {
      renderWorkspace({
        customerReplies: true,
        loadTicketDetailAction,
        updateTicketMetadataAction,
      });

      const article = getCustomerArticle();
      await user.click(within(article).getByRole("button", { name: "Reply" }));
      await user.type(
        within(article).getByRole("textbox", { name: "Reply" }),
        "Thanks for the report.",
      );
      scrollIntoView.mockClear();
      await user.click(screen.getByRole("button", { name: "Update" }));

      expect(
        within(article).queryByRole("form", {
          name: "Reply composer for Maya Patel",
        }),
      ).not.toBeInTheDocument();
      await waitFor(() =>
        expect(loadTicketDetailAction).toHaveBeenCalledWith("ticket-1"),
      );
      expect(
        await screen.findByRole("article", {
          name: "Employee reply from Agent Smith",
        }),
      ).toBeInTheDocument();
      await waitFor(() =>
        expect(scrollIntoView).toHaveBeenCalledWith({
          block: "center",
          inline: "nearest",
          behavior: "smooth",
        }),
      );
    } finally {
      if (originalScrollIntoView) {
        htmlElementPrototype.scrollIntoView = originalScrollIntoView;
      } else {
        delete htmlElementPrototype.scrollIntoView;
      }
    }
  });

  it("keeps a failed staged reply draft visible for retry", async () => {
    const user = userEvent.setup();
    const updateTicketMetadataAction = vi.fn<MutationAction>(async () => ({
      status: "failed",
      field: "communication",
      message: "The helpdesk could not be reached. Try again.",
    }));

    renderWorkspace({
      customerReplies: true,
      updateTicketMetadataAction,
    });

    const article = getCustomerArticle();
    await user.click(within(article).getByRole("button", { name: "Reply" }));
    await user.type(
      within(article).getByRole("textbox", { name: "Reply" }),
      "Thanks for the report.",
    );
    await user.click(screen.getByRole("button", { name: "Update" }));

    expect(
      await screen.findByText("The helpdesk could not be reached. Try again."),
    ).toBeInTheDocument();
    expect(within(article).getByRole("textbox", { name: "Reply" }))
      .toHaveTextContent("Thanks for the report.");
  });

  it("stages rich reply formatting through workspace Update", async () => {
    const user = userEvent.setup();
    const updateTicketMetadataAction = vi.fn<MutationAction>(async () => ({
      status: "saved",
      field: "communication",
      message: "Saved.",
    }));

    renderWorkspace({
      customerReplies: true,
      updateTicketMetadataAction,
    });

    const article = getCustomerArticle();
    await user.click(within(article).getByRole("button", { name: "Reply" }));
    await user.type(
      within(article).getByRole("textbox", { name: "Reply" }),
      "Important",
    );
    await user.click(within(article).getByRole("button", { name: "Bold" }));
    await user.click(screen.getByRole("button", { name: "Update" }));

    expect(updateTicketMetadataAction).toHaveBeenCalledWith({
      communication: {
        bodyFormat: "html",
        replyBody: "<strong>Important</strong>",
      },
      ticketExternalId: "ticket-1",
    });
  });

  it("stages safe rich reply links through workspace Update", async () => {
    const user = userEvent.setup();
    const prompt = vi.spyOn(window, "prompt").mockReturnValue("example.com/docs");
    const updateTicketMetadataAction = vi.fn<MutationAction>(async () => ({
      status: "saved",
      field: "communication",
      message: "Saved.",
    }));

    try {
      renderWorkspace({
        customerReplies: true,
        updateTicketMetadataAction,
      });

      const article = getCustomerArticle();
      await user.click(within(article).getByRole("button", { name: "Reply" }));
      await user.type(
        within(article).getByRole("textbox", { name: "Reply" }),
        "Docs",
      );
      await user.click(
        within(article).getByRole("button", { name: "Insert link" }),
      );
      await user.click(screen.getByRole("button", { name: "Update" }));

      expect(updateTicketMetadataAction).toHaveBeenCalledWith({
        communication: {
          bodyFormat: "html",
          replyBody:
            '<a href="https://example.com/docs" rel="noreferrer noopener" target="_blank">Docs</a>',
        },
        ticketExternalId: "ticket-1",
      });
    } finally {
      prompt.mockRestore();
    }
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

  it("stages a comment and sends it through workspace Update", async () => {
    const user = userEvent.setup();
    const updateTicketMetadataAction = vi.fn<MutationAction>(async () => ({
      status: "saved",
      field: "communication",
      message: "Saved.",
    }));

    renderWorkspace({
      internalNotes: true,
      updateTicketMetadataAction,
    });

    const article = getCustomerArticle();
    await user.click(within(article).getByRole("button", { name: "Comment" }));
    await user.type(
      within(article).getByRole("textbox", { name: "Comment" }),
      "Checked the logs.",
    );
    expect(within(article).queryByRole("button", { name: "Send" }))
      .not.toBeInTheDocument();
    expect(updateTicketMetadataAction).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Update" }));

    expect(updateTicketMetadataAction).toHaveBeenCalledWith({
      communication: {
        bodyFormat: "html",
        commentBody: "Checked the logs.",
      },
      ticketExternalId: "ticket-1",
    });
    await waitFor(() =>
      expect(
        within(article).queryByRole("form", {
          name: "Comment composer for Maya Patel",
        }),
      ).not.toBeInTheDocument(),
    );
  });

  it("discards staged communication text with the rest of the draft", async () => {
    const user = userEvent.setup();

    renderWorkspace({
      internalNotes: true,
    });

    const article = getCustomerArticle();
    await user.click(within(article).getByRole("button", { name: "Comment" }));
    await user.type(
      within(article).getByRole("textbox", { name: "Comment" }),
      "Checked the logs.",
    );
    await user.click(screen.getByRole("button", { name: "Discard changes" }));

    expect(within(article).getByRole("textbox", { name: "Comment" }))
      .toHaveTextContent("");
  });

  it("keeps Reply all unavailable and disconnected from server actions", async () => {
    const user = userEvent.setup();
    const updateTicketMetadataAction = vi.fn<MutationAction>(async () => ({
      status: "saved",
      field: "communication",
      message: "Saved.",
    }));

    renderWorkspace({
      customerReplies: true,
      updateTicketMetadataAction,
    });

    const article = getCustomerArticle();
    const replyAllButton = within(article).getByRole("button", {
      name: "Reply all",
    });

    expect(replyAllButton).toBeDisabled();
    await user.click(replyAllButton);

    expect(updateTicketMetadataAction).not.toHaveBeenCalled();
    expect(
      within(article).queryByRole("form", {
        name: "Reply composer for Maya Patel",
      }),
    ).not.toBeInTheDocument();
  });

  it("shows comment but not reply actions on internal articles", () => {
    const articles = [...selectedDetailProps().detail.articles, internalArticle()];

    renderWorkspace({
      articles,
      customerReplies: true,
      internalNotes: true,
    });

    const article = screen.getByRole("article", {
      name: "Internal note from Agent Smith",
    });

    expect(
      within(article).queryByRole("button", { name: "Reply" }),
    ).not.toBeInTheDocument();
    expect(
      within(article).queryByRole("button", { name: "Reply all" }),
    ).not.toBeInTheDocument();
    expect(
      within(article).getByRole("button", { name: "Comment" }),
    ).toBeInTheDocument();
  });
});
