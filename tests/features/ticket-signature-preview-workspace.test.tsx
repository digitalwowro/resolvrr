import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { WorkspaceSignatureActions } from "@/features/workspace/components/ticket-signature-preview-action-context";
import {
  deferred,
  getCustomerArticle,
  renderWorkspace,
  type MutationAction,
} from "./ticket-communication-workspace-test-utils";

const settings = {
  canManage: false,
  groupOptions: [],
  source: "zammad" as const,
  templates: [],
  workspaceLabel: "Support",
};

describe("outbound signature preview", () => {
  it("blocks Update until the exact rendered signature has been reviewed", async () => {
    const user = userEvent.setup();
    const preview = deferred<{
      signature: { contextVersion: string; renderedHtml: string; source: "zammad" };
      status: "available";
    }>();
    const update = vi.fn<MutationAction>(async () => ({ status: "saved" }));
    const unavailable = async () => ({ data: settings, message: "Unavailable", ok: false });
    const signatureActions: WorkspaceSignatureActions = {
      deleteWorkspaceSignatureTemplateAction: unavailable,
      loadTicketSignaturePreviewAction: () => preview.promise,
      loadWorkspaceSignatureSettingsAction: async () => settings,
      saveWorkspaceSignatureSourceAction: unavailable,
      saveWorkspaceSignatureTemplateAction: unavailable,
    };
    renderWorkspace({
      customerReplies: true,
      signatureActions,
      updateTicketMetadataAction: update,
    });

    await user.click(within(getCustomerArticle()).getByRole("button", { name: "Reply" }));
    await user.type(screen.getByRole("textbox", { name: "Reply" }), "Hello");
    const editorShell = screen.getByRole("textbox", { name: "Reply" })
      .parentElement?.parentElement;
    expect(screen.getByRole("button", { name: "Update" })).toBeDisabled();
    expect(editorShell).toContainElement(
      screen.getByText("Loading signature preview…"),
    );

    preview.resolve({
      signature: {
        contextVersion: "zammad-signature-v1",
        renderedHtml: "<p><strong>Agent signature</strong></p>",
        source: "zammad",
      },
      status: "available",
    });
    const signatureToggle = await screen.findByRole("button", {
      name: "Signature from Zammad",
    });
    expect(editorShell).toContainElement(signatureToggle);
    expect(signatureToggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("Read-only")).toBeInTheDocument();
    expect(screen.queryByText("Agent signature")).not.toBeInTheDocument();
    await user.click(signatureToggle);
    expect(signatureToggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Agent signature")).toBeInTheDocument();
    expect(
      screen.getByText("Agent signature").closest("[contenteditable='true']"),
    ).toBeNull();
    await waitFor(() => expect(screen.getByRole("button", { name: "Update" })).toBeEnabled());

    await user.click(signatureToggle);
    expect(signatureToggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Agent signature")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Update" }));

    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      communication: expect.objectContaining({
        signatureContext: {
          contextVersion: "zammad-signature-v1",
          source: "zammad",
        },
      }),
    }));
  });
});
