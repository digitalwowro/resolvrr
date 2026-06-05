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

    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        initialAiSettingsData={{
          activeWorkspace: { id: "connection-1", label: "Support" },
          canManageWorkspace: true,
          policy: "disabled",
          userConfig: null,
          workspaceConfig: null,
        }}
        listResult={availableList}
        logoutAction={noopAction}
        rows={[row]}
        saveWorkspaceAiSettingsAction={vi.fn()}
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
    await user.selectOptions(
      within(dialog).getByLabelText("Workspace AI"),
      "admin-managed",
    );
    expect(within(dialog).getByLabelText("API key")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Save and test" }))
      .toBeInTheDocument();
  });

  it("shows users status only for admin-managed AI settings", async () => {
    const user = userEvent.setup();

    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        initialAiSettingsData={{
          activeWorkspace: { id: "connection-1", label: "Support" },
          canManageWorkspace: false,
          policy: "admin-managed",
          userConfig: null,
          workspaceConfig: {
            baseUrl: "https://api.openai.test/v1",
            hasApiKey: true,
            model: "support-model",
            providerProtocol: "openai-compatible",
          },
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
      expect(formData.get("model")).toBe("support-model");
      expect(formData.get("apiKey")).toBe("openai-key");
      return {
        code: "ai-user-settings-saved" as const,
        data: {
          activeWorkspace: { id: "connection-1", label: "Support" },
          canManageWorkspace: false,
          policy: "user-provided" as const,
          userConfig: {
            baseUrl: "https://api.openai.test/v1",
            hasApiKey: true,
            model: "support-model",
            providerProtocol: "openai-compatible" as const,
          },
          workspaceConfig: null,
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
          canManageWorkspace: false,
          policy: "user-provided",
          userConfig: null,
          workspaceConfig: null,
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
    await user.type(
      within(dialog).getByLabelText("Base URL"),
      "https://api.openai.test/v1",
    );
    await user.type(within(dialog).getByLabelText("Model"), "support-model");
    await user.type(within(dialog).getByLabelText("API key"), "openai-key");
    await user.click(within(dialog).getByRole("button", { name: "Save and test" }));

    expect(saveUserWorkspaceAiSettingsAction).toHaveBeenCalledOnce();
    expect(await within(dialog).findByText("AI key saved.")).toBeInTheDocument();
  });
});
