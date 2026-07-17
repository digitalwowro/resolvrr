import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RewriteDraftAction } from "@/features/ai";
import {
  getCustomerArticle,
  renderWorkspace,
} from "./ticket-communication-workspace-test-utils";

const persistence = vi.hoisted(() => ({
  clearPersistedCommunicationDrafts: vi.fn(),
  loadPersistedCommunicationDrafts: vi.fn(),
  pruneExpiredCommunicationDrafts: vi.fn(),
  savePersistedCommunicationDraft: vi.fn(),
}));

vi.mock(
  "@/features/workspace/components/ticket-communication-draft-persistence",
  () => persistence,
);

beforeEach(() => {
  for (const mocked of Object.values(persistence)) {
    mocked.mockReset();
    mocked.mockResolvedValue(undefined);
  }
  persistence.loadPersistedCommunicationDrafts.mockResolvedValue([]);
});

function selectEditorText(editor: HTMLElement, characterCount: number) {
  const textNode = editor.firstChild;
  expect(textNode).toBeInstanceOf(Text);
  const range = document.createRange();
  range.setStart(textNode!, 0);
  range.setEnd(textNode!, characterCount);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
  fireEvent.mouseUp(editor);
}

describe("TicketWorkspace selected-text AI drafts", () => {
  it("rewrites only the selected editor text and preserves surrounding content", async () => {
    const user = userEvent.setup();
    const rewriteDraftAction = vi.fn<RewriteDraftAction>(async (request) => {
      expect(request.target).toMatchObject({ kind: "selection" });
      if (request.target.kind === "selection") {
        expect(request.target.fragmentHtml).toContain("check logs");
        expect(request.target.fragmentHtml).not.toContain("Keep this ending");
      }
      return {
        generatedAt: "2026-07-17T18:30:00.000Z",
        operation: "proofread",
        status: "available",
        text: "Please check the logs.",
      };
    });

    renderWorkspace({ customerReplies: true, rewriteDraftAction });
    await user.click(
      within(getCustomerArticle()).getByRole("button", { name: "Reply" }),
    );
    const editor = screen.getByRole("textbox", { name: "Reply" });
    await user.type(editor, "Please check logs. Keep this ending.");
    expect(screen.getByRole("button", { name: "Proofread" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rephrase" })).toBeInTheDocument();
    selectEditorText(editor, "Please check logs.".length);

    expect(
      screen.getByRole("button", { name: "Proofread selection" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Rephrase selection" }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Proofread selection" }),
    );
    expect(await screen.findByText("Please check the logs.")).toBeInTheDocument();
    await waitFor(() =>
      expect(persistence.savePersistedCommunicationDraft).toHaveBeenCalledWith(
        expect.objectContaining({
          suggestions: [
            expect.objectContaining({
              target: expect.objectContaining({ kind: "selection" }),
            }),
          ],
        }),
      ),
    );
    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(editor).toHaveTextContent(
      "Please check the logs. Keep this ending.",
    );
    expect(screen.getByText("Suggestion applied to the selected text."))
      .toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Proofread" })).toBeInTheDocument();
  });

  it("refuses to apply a selected-text suggestion after the draft changes", async () => {
    const user = userEvent.setup();
    const rewriteDraftAction = vi.fn<RewriteDraftAction>(async () => ({
      generatedAt: "2026-07-17T18:35:00.000Z",
      operation: "proofread",
      status: "available",
      text: "Changed selection.",
    }));

    renderWorkspace({ customerReplies: true, rewriteDraftAction });
    await user.click(
      within(getCustomerArticle()).getByRole("button", { name: "Reply" }),
    );
    const editor = screen.getByRole("textbox", { name: "Reply" });
    await user.type(editor, "Selected text. Keep this.");
    selectEditorText(editor, "Selected text.".length);
    await user.click(
      screen.getByRole("button", { name: "Proofread selection" }),
    );
    expect(await screen.findByText("Changed selection.")).toBeInTheDocument();

    editor.innerHTML = "<p>Draft changed while reviewing.</p>";
    fireEvent.input(editor);
    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(editor).toHaveTextContent("Draft changed while reviewing.");
    expect(
      screen.getByText(
        "The selected text changed after this suggestion was generated. Select it again and retry.",
      ),
    ).toBeInTheDocument();
  });

  it("uses the selected range for a chosen rephrase style", async () => {
    const user = userEvent.setup();
    const rewriteDraftAction = vi.fn<RewriteDraftAction>(async (request) => {
      expect(request).toMatchObject({
        operation: "rephrase",
        rephraseStyleId: "style-friendly",
        target: { kind: "selection" },
      });
      return {
        generatedAt: "2026-07-17T18:40:00.000Z",
        operation: "rephrase",
        rephraseStyle: { id: "style-friendly", label: "Friendly" },
        status: "available",
        text: "Friendlier text.",
      };
    });

    renderWorkspace({
      customerReplies: true,
      rephraseStyleOptions: [{ id: "style-friendly", label: "Friendly" }],
      rewriteDraftAction,
    });
    await user.click(
      within(getCustomerArticle()).getByRole("button", { name: "Reply" }),
    );
    const editor = screen.getByRole("textbox", { name: "Reply" });
    await user.type(editor, "Draft text. Keep this.");
    selectEditorText(editor, "Draft text.".length);
    await user.click(
      screen.getByRole("button", { name: "Rephrase selection" }),
    );
    await user.click(screen.getByRole("menuitem", { name: "Friendly" }));

    expect(await screen.findByText("Friendlier text.")).toBeInTheDocument();
    expect(rewriteDraftAction).toHaveBeenCalledOnce();
  });
});
