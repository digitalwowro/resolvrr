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

describe("TicketWorkspace AI settings", () => {
  beforeEach(() => {
    routerPush.mockClear();
    routerRefresh.mockClear();
  });

  it("shows active-workspace AI controls to admins", async () => {
    const user = userEvent.setup();
    const saveWorkspaceAiSettingsAction = vi.fn(async (formData: FormData) => {
      expect(formData.get("providerProtocol")).toBe("openai-compatible");
      expect(formData.get("baseUrl")).toBe("https://api.openai.test/v1");
      expect(formData.get("model")).toBe("gpt-5.4-mini");
      expect(formData.get("apiKey")).toBe("workspace-key");
      return {
        code: "ai-settings-saved" as const,
        data: {
          activeWorkspace: { id: "connection-1", label: "Support" },
          allowUserPromptOverrides: false,
          canManageWorkspace: true,
          canViewPromptCenter: false,
          policy: "admin-managed" as const,
          userConfig: null,
          workspaceConfig: {
            baseUrl: "https://api.openai.test/v1",
            hasApiKey: true,
            model: "gpt-5.4-mini",
            providerProtocol: "openai-compatible" as const,
          },
          workspaceConfigConfigured: true,
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
          allowUserPromptOverrides: false,
          canManageWorkspace: true,
          canViewPromptCenter: false,
          policy: "disabled",
          userConfig: null,
          workspaceConfig: null,
          workspaceConfigConfigured: false,
        }}
        listResult={availableList}
        logoutAction={noopAction}
        rows={[row]}
        saveWorkspaceAiSettingsAction={saveWorkspaceAiSettingsAction}
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
    await user.click(within(dialog).getByRole("button", { name: "AI Settings" }));

    expect(within(dialog).getByRole("heading", { name: "AI Settings" }))
      .toBeInTheDocument();
    expect(within(dialog).getByLabelText("Workspace AI")).toBeInTheDocument();
    await selectDropdown(user, dialog, "Workspace AI", "Use workspace key");
    expect(within(dialog).getByRole("link", { name: "OpenAI" }))
      .toHaveAttribute("href", "https://developers.openai.com/api/docs/models");
    expect(within(dialog).getByRole("link", { name: "Anthropic" }))
      .toHaveAttribute(
        "href",
        "https://platform.claude.com/docs/en/about-claude/models/overview",
      );
    await user.type(within(dialog).getByLabelText("Model"), "gpt-5.4-mini");
    await user.click(within(dialog).getByRole("button", { name: "Anthropic" }));
    expect(within(dialog).getByLabelText("Base URL")).toHaveValue(
      "https://api.anthropic.com/v1",
    );
    await user.clear(within(dialog).getByLabelText("Base URL"));
    await user.type(
      within(dialog).getByLabelText("Base URL"),
      "https://api.openai.test/v1",
    );
    await user.type(within(dialog).getByLabelText("API key"), "workspace-key");
    expect(within(dialog).getByLabelText("API key")).toBeInTheDocument();
    await user.click(
      within(dialog).getByRole("button", { name: "Save workspace key" }),
    );

    expect(saveWorkspaceAiSettingsAction).toHaveBeenCalledOnce();
  });

  it("shows users status only for admin-managed AI settings", async () => {
    const user = userEvent.setup();

    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        initialAiSettingsData={{
          activeWorkspace: { id: "connection-1", label: "Support" },
          allowUserPromptOverrides: false,
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
    await user.click(within(dialog).getByRole("button", { name: "AI Settings" }));

    expect(within(dialog).getByText("AI is enabled by the workspace admin."))
      .toBeInTheDocument();
    expect(within(dialog).queryByLabelText("API key")).not.toBeInTheDocument();
  });

  it("lets users save their own key for user-provided AI settings", async () => {
    const user = userEvent.setup();
    const saveUserWorkspaceAiSettingsAction = vi.fn(async (formData: FormData) => {
      expect(formData.get("providerProtocol")).toBe("openai-compatible");
      expect(formData.get("baseUrl")).toBe("https://api.openai.test/v1");
      expect(formData.get("model")).toBe("company-support-model");
      expect(formData.get("apiKey")).toBe("openai-key");
      return {
        code: "ai-user-settings-saved" as const,
        data: {
          activeWorkspace: { id: "connection-1", label: "Support" },
          allowUserPromptOverrides: false,
          canManageWorkspace: false,
          canViewPromptCenter: false,
          policy: "user-provided" as const,
          userConfig: {
            baseUrl: "https://api.openai.test/v1",
            hasApiKey: true,
            model: "support-model",
            providerProtocol: "openai-compatible" as const,
          },
          workspaceConfig: null,
          workspaceConfigConfigured: false,
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
          allowUserPromptOverrides: false,
          canManageWorkspace: false,
          canViewPromptCenter: false,
          policy: "user-provided",
          userConfig: null,
          workspaceConfig: null,
          workspaceConfigConfigured: false,
        }}
        listResult={availableList}
        logoutAction={noopAction}
        rows={[row]}
        saveUserWorkspaceAiSettingsAction={saveUserWorkspaceAiSettingsAction}
        setActiveConnectionAction={noopAction}
        tabs={[{ ...row }]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="agent@example.com"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Open profile menu, Support" }));
    await user.click(screen.getByRole("menuitem", { name: "Settings" }));
    const dialog = screen.getByRole("dialog", { name: "Settings" });
    await user.click(within(dialog).getByRole("button", { name: "AI Settings" }));
    await user.type(within(dialog).getByLabelText("Model"), "company-support-model");
    await user.type(
      within(dialog).getByLabelText("Base URL"),
      "https://api.openai.test/v1",
    );
    await user.type(within(dialog).getByLabelText("API key"), "openai-key");
    await user.click(
      within(dialog).getByRole("button", { name: "Save personal key" }),
    );

    expect(saveUserWorkspaceAiSettingsAction).toHaveBeenCalledOnce();
    expect(await within(dialog).findByText("AI key saved.")).toBeInTheDocument();
  });

  it("submits existing saved custom model IDs unchanged", async () => {
    const user = userEvent.setup();
    const saveWorkspaceAiSettingsAction = vi.fn(async (formData: FormData) => {
      expect(formData.get("providerProtocol")).toBe("openai-compatible");
      expect(formData.get("model")).toBe("existing-custom-model");
      expect(formData.get("apiKey")).toBe("");
      return {
        code: "ai-settings-saved" as const,
        data: {
          activeWorkspace: { id: "connection-1", label: "Support" },
          allowUserPromptOverrides: false,
          canManageWorkspace: true,
          canViewPromptCenter: false,
          policy: "admin-managed" as const,
          userConfig: null,
          workspaceConfig: {
            baseUrl: "https://api.openai.test/v1",
            hasApiKey: true,
            model: "existing-custom-model",
            providerProtocol: "openai-compatible" as const,
          },
          workspaceConfigConfigured: true,
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
          allowUserPromptOverrides: false,
          canManageWorkspace: true,
          canViewPromptCenter: false,
          policy: "admin-managed",
          userConfig: null,
          workspaceConfig: {
            baseUrl: "https://api.openai.test/v1",
            hasApiKey: true,
            model: "existing-custom-model",
            providerProtocol: "openai-compatible",
          },
          workspaceConfigConfigured: true,
        }}
        listResult={availableList}
        logoutAction={noopAction}
        rows={[row]}
        saveWorkspaceAiSettingsAction={saveWorkspaceAiSettingsAction}
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
    await user.click(within(dialog).getByRole("button", { name: "AI Settings" }));

    expect(within(dialog).getByDisplayValue("existing-custom-model"))
      .toBeInTheDocument();
    await user.click(
      within(dialog).getByRole("button", { name: "Save workspace key" }),
    );

    expect(saveWorkspaceAiSettingsAction).toHaveBeenCalledOnce();
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

async function selectDropdown(
  user: ReturnType<typeof userEvent.setup>,
  root: HTMLElement,
  label: string,
  option: string,
) {
  await user.click(within(root).getByRole("combobox", { name: label }));
  await user.click(within(root).getByRole("option", { name: option }));
}
