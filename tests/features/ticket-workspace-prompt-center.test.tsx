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

  it("lets admins manage workspace prompts and prompt override policy", async () => {
    const user = userEvent.setup();
    const loadAiPromptCenterAction = vi.fn(async () => ({
      activeWorkspace: { id: "connection-1", label: "Support" },
      adminPrompts: [
        {
          builtInPrompt: "Built-in summary prompt.",
          description: "Internal selected-ticket summary instructions.",
          isCustomized: false,
          key: "ticket-summary" as const,
          label: "Ticket summary",
          maxLength: 2_000,
          prompt: "Built-in summary prompt.",
          userOverridable: false,
        },
      ],
      allowUserPromptOverrides: true,
      canManageWorkspace: true,
      canView: true,
      policy: "admin-managed" as const,
      userPrompts: [],
    }));
    const saveWorkspaceAiPromptAction = vi.fn(async (formData: FormData) => {
      expect(formData.get("promptKey")).toBe("ticket-summary");
      expect(formData.get("prompt")).toBe("Updated summary prompt.");
      return {
        code: "ai-prompt-saved" as const,
        data: {
          activeWorkspace: { id: "connection-1", label: "Support" },
          adminPrompts: [
            {
              builtInPrompt: "Built-in summary prompt.",
              description: "Internal selected-ticket summary instructions.",
              isCustomized: true,
              key: "ticket-summary" as const,
              label: "Ticket summary",
              maxLength: 2_000,
              prompt: "Updated summary prompt.",
              userOverridable: false,
            },
          ],
          allowUserPromptOverrides: true,
          canManageWorkspace: true,
          canView: true,
          policy: "admin-managed" as const,
          userPrompts: [],
        },
        ok: true,
      };
    });
    const saveAiPromptOverridePolicyAction = vi.fn(async (formData: FormData) => {
      expect(formData.get("allowUserPromptOverrides")).toBeNull();
      return {
        code: "ai-prompt-policy-saved" as const,
        data: {
          activeWorkspace: { id: "connection-1", label: "Support" },
          adminPrompts: [],
          allowUserPromptOverrides: false,
          canManageWorkspace: true,
          canView: true,
          policy: "admin-managed" as const,
          userPrompts: [],
        },
        ok: true,
      };
    });

    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        initialAiSettingsData={{
          activeWorkspace: { id: "connection-1", label: "Support" },
          allowUserPromptOverrides: true,
          canManageWorkspace: true,
          canViewPromptCenter: true,
          policy: "admin-managed",
          userConfig: null,
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
        rows={[row]}
        saveAiPromptOverridePolicyAction={saveAiPromptOverridePolicyAction}
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
    await user.clear(within(dialog).getByLabelText("Prompt"));
    await user.type(within(dialog).getByLabelText("Prompt"), "Updated summary prompt.");
    await user.click(within(dialog).getByRole("button", { name: "Save prompt" }));
    expect(saveWorkspaceAiPromptAction).toHaveBeenCalledOnce();

    await user.click(
      within(dialog).getByRole("checkbox", {
        name: /Allow personal prompt overrides/u,
      }),
    );
    await user.click(within(dialog).getByRole("button", { name: "Save policy" }));
    expect(saveAiPromptOverridePolicyAction).toHaveBeenCalledOnce();
  });

  it("hides Prompt Center from non-admins when no user prompts are editable", async () => {
    const user = userEvent.setup();

    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        initialAiSettingsData={{
          activeWorkspace: { id: "connection-1", label: "Support" },
          allowUserPromptOverrides: true,
          canManageWorkspace: false,
          canViewPromptCenter: false,
          policy: "admin-managed",
          userConfig: null,
          workspaceConfig: null,
          workspaceConfigConfigured: true,
        }}
        listResult={availableList}
        logoutAction={noopAction}
        rows={[row]}
        setActiveConnectionAction={noopAction}
        tabs={[{ ...row }]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="agent@example.com"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Open profile menu, Support" }));
    await user.click(screen.getByRole("menuitem", { name: "Settings" }));
    const dialog = screen.getByRole("dialog", { name: "Settings" });

    expect(within(dialog).queryByRole("button", { name: "Prompt Center" }))
      .not.toBeInTheDocument();
  });
});
