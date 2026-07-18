import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultWorkspaceTicketColumns } from "@/features/tickets";
import { TicketWorkspace } from "@/features/workspace/components/ticket-workspace";
import {
  availableList,
  noopAction,
  noopMutationAction,
  row,
} from "./ticket-workspace-test-utils";
import {
  promptCenterActiveWorkspace,
  promptCenterData,
} from "./ticket-workspace-prompt-center-test-data";

const routerPush = vi.fn();
const routerRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPush,
    refresh: routerRefresh,
  }),
}));

describe("TicketWorkspace Prompt Center", () => {
  beforeEach(() => {
    routerPush.mockClear();
    routerRefresh.mockClear();
  });

  it("lets admins manage workspace prompts and rephrase styles", async () => {
    const user = userEvent.setup();
    const loadAiPromptCenterAction = vi.fn(async () => ({
      ...promptCenterData(),
    }));
    const saveWorkspaceAiPromptAction = vi.fn(async (formData: FormData) => {
      expect(formData.get("promptKey")).toBe("ticket-summary");
      expect(formData.get("prompt")).toBe("Updated summary guidance.");
      return {
        code: "ai-prompt-saved" as const,
        data: promptCenterData({
          isCustomized: true,
          prompt: "Updated summary guidance.",
        }),
        ok: true,
      };
    });
    const saveWorkspaceAiRephraseStyleAction = vi.fn(async (formData: FormData) => {
      const styleId = formData.get("styleId");
      if (styleId === "style-concise") {
        expect(formData.get("prompt")).toBe("Use fewer words.");
        return {
          code: "ai-rephrase-style-saved" as const,
          data: promptCenterData({
            isCustomized: true,
            prompt: "Updated summary guidance.",
            styles: [
              {
                id: "style-concise",
                isBuiltIn: true,
                isCustomized: true,
                isEnabled: true,
                label: "Concise",
                maxLength: 2_000,
                prompt: "Use fewer words.",
                sortOrder: 10,
              },
              {
                id: "style-friendly",
                isBuiltIn: true,
                isCustomized: false,
                isEnabled: true,
                label: "Friendly",
                maxLength: 2_000,
                prompt: "Make the reply friendly.",
                sortOrder: 20,
              },
            ],
          }),
          ok: true,
        };
      }
      expect(styleId).toBeNull();
      expect(formData.get("label")).toBe("Empathetic");
      expect(formData.get("prompt")).toBe("Sound empathetic.");
      return {
        code: "ai-rephrase-style-created" as const,
        data: promptCenterData(
          {
            isCustomized: true,
              prompt: "Updated summary guidance.",
            styles: [
              {
                id: "style-concise",
                isBuiltIn: true,
                isCustomized: true,
                isEnabled: true,
                label: "Concise",
                maxLength: 2_000,
                prompt: "Use fewer words.",
                sortOrder: 10,
              },
              {
                id: "style-friendly",
                isBuiltIn: true,
                isCustomized: false,
                isEnabled: true,
                label: "Friendly",
                maxLength: 2_000,
                prompt: "Make the reply friendly.",
                sortOrder: 20,
              },
              {
                id: "style-empathetic",
                isBuiltIn: false,
                isCustomized: true,
                isEnabled: true,
                label: "Empathetic",
                maxLength: 2_000,
                prompt: "Sound empathetic.",
                sortOrder: 30,
              },
            ],
          },
        ),
        ok: true,
      };
    });
    const moveWorkspaceAiRephraseStyleAction = vi.fn(
      async (styleId: string, direction: "down" | "up") => {
        expect(styleId).toBe("style-friendly");
        expect(direction).toBe("up");
        return {
          code: "ai-rephrase-style-moved" as const,
          data: promptCenterData({
            styles: [
              {
                id: "style-friendly",
                isBuiltIn: true,
                isCustomized: false,
                isEnabled: true,
                label: "Friendly",
                maxLength: 2_000,
                prompt: "Make the reply friendly.",
                sortOrder: 10,
              },
              {
                id: "style-concise",
                isBuiltIn: true,
                isCustomized: false,
                isEnabled: true,
                label: "Concise",
                maxLength: 2_000,
                prompt: "Make the reply concise.",
                sortOrder: 20,
              },
            ],
          }),
          ok: true,
        };
      },
    );

    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        initialAiSettingsData={{
          activeWorkspace: promptCenterActiveWorkspace,
          canManageWorkspace: true,
          canViewPromptCenter: true,
          policy: "admin-managed",
          userConfig: null,
          userPermissions: {
            canEditAiRephraseStyleOverrides: true,
            canEditMyStyle: true,
          },
          workspaceConfig: {
            baseUrl: "https://api.openai.test/v1",
            hasApiKey: true,
            model: "support-model",
            providerProtocol: "openai-compatible",
          },
          workspaceConfigConfigured: true,
        }}
        listResult={availableList}
        loadAiPromptCenterAction={loadAiPromptCenterAction}
        logoutAction={noopAction}
        moveWorkspaceAiRephraseStyleAction={moveWorkspaceAiRephraseStyleAction}
        rows={[row]}
        saveWorkspaceAiRephraseStyleAction={saveWorkspaceAiRephraseStyleAction}
        saveWorkspaceAiPromptAction={saveWorkspaceAiPromptAction}
        setActiveConnectionAction={noopAction}
        tabs={[{ ...row }]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="admin@example.com"
        userRole="ADMIN"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Open profile menu, Support" }));
    await user.click(screen.getByRole("menuitem", { name: "Settings" }));
    const dialog = screen.getByRole("dialog", { name: "Settings" });
    await user.click(within(dialog).getByRole("button", { name: "Prompt Center" }));

    expect(await within(dialog).findByRole("heading", { name: "Prompt Center" }))
      .toBeInTheDocument();
    expect(within(dialog).getByText("AI operations")).toBeInTheDocument();
    expect(within(dialog).getByText("Rephrase styles")).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", {
        name: "Ticket summary, Default guidance",
      }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("heading", { name: "Output contract" }),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("Situation is always required."))
      .toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "Concise, Enabled, Built-in" }),
    ).toBeInTheDocument();

    await user.clear(within(dialog).getByLabelText("Summary guidance"));
    await user.type(
      within(dialog).getByLabelText("Summary guidance"),
      "Updated summary guidance.",
    );
    await user.click(within(dialog).getByRole("button", { name: "Save guidance" }));
    expect(saveWorkspaceAiPromptAction).toHaveBeenCalledOnce();
    expect(
      within(dialog).getByRole("button", {
        name: "Ticket summary, Custom guidance",
      }),
    ).toBeInTheDocument();

    await user.click(
      within(dialog).getByRole("button", { name: "Concise, Enabled, Built-in" }),
    );
    const stylePrompt = await within(dialog).findByLabelText("Style prompt");
    await user.clear(stylePrompt);
    await user.type(stylePrompt, "Use fewer words.");
    await user.click(within(dialog).getByRole("button", { name: "Save style" }));
    expect(saveWorkspaceAiRephraseStyleAction).toHaveBeenCalledTimes(1);

    await user.click(
      within(dialog).getByRole("button", { name: "Friendly, Enabled, Built-in" }),
    );
    await user.click(within(dialog).getByRole("button", { name: "Move Friendly up" }));
    expect(moveWorkspaceAiRephraseStyleAction).toHaveBeenCalledOnce();
    expect(within(dialog).getByLabelText("Style name")).toHaveValue("Friendly");

    await user.click(within(dialog).getByRole("button", { name: "New style" }));
    await user.type(within(dialog).getByLabelText("Style name"), "Empathetic");
    await user.type(within(dialog).getByLabelText("Style prompt"), "Sound empathetic.");
    await user.click(within(dialog).getByRole("button", { name: "Add style" }));
    expect(saveWorkspaceAiRephraseStyleAction).toHaveBeenCalledTimes(2);
    expect(
      await within(dialog).findByRole("button", {
        name: "Empathetic, Enabled, Custom",
      }),
    ).toBeInTheDocument();
  });

});
