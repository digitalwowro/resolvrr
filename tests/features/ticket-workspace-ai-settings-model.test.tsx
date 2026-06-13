import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { defaultWorkspaceTicketColumns } from "@/features/tickets";
import { TicketWorkspace } from "@/features/workspace/components/ticket-workspace";
import {
  availableList,
  noopAction,
  noopMutationAction,
  row,
} from "./ticket-workspace-test-utils";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

describe("TicketWorkspace AI settings custom model", () => {
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
});
