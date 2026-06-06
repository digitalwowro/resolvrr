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

describe("TicketWorkspace AI settings admin personal key", () => {
  beforeEach(() => {
    routerPush.mockClear();
    routerRefresh.mockClear();
  });

  it("lets admins save their own per-workspace key", async () => {
    const user = userEvent.setup();
    const saveUserWorkspaceAiSettingsAction = vi.fn(async (formData: FormData) => {
      expect(formData.get("providerProtocol")).toBe("openai-compatible");
      expect(formData.get("model")).toBe("company-support-model");
      expect(formData.get("apiKey")).toBe("admin-personal-key");
      return {
        code: "ai-user-settings-saved" as const,
        data: {
          activeWorkspace: { id: "connection-1", label: "Support" },
          canManageWorkspace: true,
          policy: "user-provided" as const,
          userConfig: {
            baseUrl: "https://api.openai.test/v1",
            hasApiKey: true,
            model: "company-support-model",
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
          canManageWorkspace: true,
          policy: "user-provided",
          userConfig: null,
          workspaceConfig: null,
          workspaceConfigConfigured: false,
        }}
        listResult={availableList}
        logoutAction={noopAction}
        rows={[row]}
        saveUserWorkspaceAiSettingsAction={saveUserWorkspaceAiSettingsAction}
        saveWorkspaceAiSettingsAction={vi.fn()}
        setActiveConnectionAction={noopAction}
        tabs={[{ ...row }]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="admin@example.com"
        userRole="ADMIN"
      />,
    );

    await user.click(screen.getByRole("button", {
      name: "Open profile menu, Support",
    }));
    await user.click(screen.getByRole("menuitem", { name: "Settings" }));
    const dialog = screen.getByRole("dialog", { name: "Settings" });
    await user.click(within(dialog).getByRole("button", { name: "AI Settings" }));
    expect(
      within(dialog).queryByRole("button", { name: "Save workspace policy" }),
    ).toBeNull();

    const personalSection = within(dialog)
      .getByRole("heading", { name: "Personal workspace key" })
      .closest("section");
    expect(personalSection).toBeTruthy();
    await user.type(
      within(personalSection as HTMLElement).getByLabelText("Model"),
      "company-support-model",
    );
    await user.type(
      within(personalSection as HTMLElement).getByLabelText("Base URL"),
      "https://api.openai.test/v1",
    );
    await user.type(
      within(personalSection as HTMLElement).getByLabelText("API key"),
      "admin-personal-key",
    );
    await user.click(
      within(personalSection as HTMLElement).getByRole("button", {
        name: "Save personal key",
      }),
    );

    expect(saveUserWorkspaceAiSettingsAction).toHaveBeenCalledOnce();
    expect(await within(dialog).findByText("AI key saved.")).toBeInTheDocument();
  });

  it("hides the personal key form when users-provide-keys is not selected", async () => {
    const user = userEvent.setup();

    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        initialAiSettingsData={{
          activeWorkspace: { id: "connection-1", label: "Support" },
          canManageWorkspace: true,
          policy: "user-provided",
          userConfig: null,
          workspaceConfig: null,
          workspaceConfigConfigured: false,
        }}
        listResult={availableList}
        logoutAction={noopAction}
        rows={[row]}
        saveUserWorkspaceAiSettingsAction={vi.fn()}
        saveWorkspaceAiSettingsAction={vi.fn()}
        setActiveConnectionAction={noopAction}
        tabs={[{ ...row }]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="admin@example.com"
        userRole="ADMIN"
      />,
    );

    await user.click(screen.getByRole("button", {
      name: "Open profile menu, Support",
    }));
    await user.click(screen.getByRole("menuitem", { name: "Settings" }));
    const dialog = screen.getByRole("dialog", { name: "Settings" });
    await user.click(within(dialog).getByRole("button", { name: "AI Settings" }));

    expect(within(dialog).getByRole("heading", {
      name: "Personal workspace key",
    })).toBeInTheDocument();
    await selectDropdown(user, dialog, "Workspace AI", "Disabled");
    expect(within(dialog).queryByRole("heading", {
      name: "Personal workspace key",
    })).toBeNull();
    expect(
      within(dialog).getByRole("button", { name: "Save workspace policy" }),
    ).toBeInTheDocument();
  });

  it("waits for the users-provide-keys policy to be saved before showing the personal key form", async () => {
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
          workspaceConfigConfigured: false,
        }}
        listResult={availableList}
        logoutAction={noopAction}
        rows={[row]}
        saveUserWorkspaceAiSettingsAction={vi.fn()}
        saveWorkspaceAiSettingsAction={vi.fn()}
        setActiveConnectionAction={noopAction}
        tabs={[{ ...row }]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="admin@example.com"
        userRole="ADMIN"
      />,
    );

    await user.click(screen.getByRole("button", {
      name: "Open profile menu, Support",
    }));
    await user.click(screen.getByRole("menuitem", { name: "Settings" }));
    const dialog = screen.getByRole("dialog", { name: "Settings" });
    await user.click(within(dialog).getByRole("button", { name: "AI Settings" }));

    await selectDropdown(user, dialog, "Workspace AI", "Users provide keys");

    expect(within(dialog).queryByRole("heading", {
      name: "Personal workspace key",
    })).toBeNull();
    expect(
      within(dialog).getByRole("button", { name: "Save workspace policy" }),
    ).toBeInTheDocument();
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
