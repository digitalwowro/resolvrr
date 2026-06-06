import { render, screen, waitFor, within } from "@testing-library/react";
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

describe("TicketWorkspace AI settings active workspace switch", () => {
  beforeEach(() => {
    routerPush.mockClear();
    routerRefresh.mockClear();
  });

  it("reloads AI settings after changing the active workspace in settings", async () => {
    const user = userEvent.setup();
    const saveWorkspaceAiSettingsAction = vi.fn(async (formData: FormData) => {
      expect(formData.get("policy")).toBe("disabled");
      expect(formData.get("model")).toBeNull();
      return {
        code: "ai-settings-saved" as const,
        data: {
          activeWorkspace: { id: "connection-2", label: "Sales" },
          canManageWorkspace: true,
          policy: "disabled" as const,
          userConfig: null,
          workspaceConfig: null,
          workspaceConfigConfigured: false,
        },
        ok: true,
      };
    });
    const loadWorkspaceAiSettingsAction = vi.fn(async () => ({
      activeWorkspace: { id: "connection-2", label: "Sales" },
      canManageWorkspace: true,
      policy: "disabled" as const,
      userConfig: null,
      workspaceConfig: null,
      workspaceConfigConfigured: false,
    }));
    const setActiveConnectionAction = vi.fn(async () => ({
      code: "active-set" as const,
      connections: [
        workspaceConnection("connection-1", "Support", false),
        workspaceConnection("connection-2", "Sales", true),
      ],
      ok: true,
    }));

    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[
          workspaceConnection("connection-1", "Support", true),
          workspaceConnection("connection-2", "Sales", false),
        ]}
        initialAiSettingsData={{
          activeWorkspace: { id: "connection-1", label: "Support" },
          canManageWorkspace: true,
          policy: "admin-managed",
          userConfig: null,
          workspaceConfig: {
            baseUrl: "https://api.openai.test/v1",
            hasApiKey: true,
            model: "workspace-a-model",
            providerProtocol: "openai-compatible",
          },
          workspaceConfigConfigured: true,
        }}
        listResult={availableList}
        loadWorkspaceAiSettingsAction={loadWorkspaceAiSettingsAction}
        logoutAction={noopAction}
        rows={[row]}
        saveWorkspaceAiSettingsAction={saveWorkspaceAiSettingsAction}
        setActiveConnectionAction={setActiveConnectionAction}
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
    expect(within(dialog).getByText("Support")).toBeInTheDocument();
    expect(within(dialog).getByDisplayValue("workspace-a-model")).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Workspaces" }));
    const salesWorkspace = within(dialog).getByText("Sales").closest("article");
    expect(salesWorkspace).toBeTruthy();
    await user.click(
      within(salesWorkspace as HTMLElement).getByRole("button", {
        name: "Set active",
      }),
    );
    await waitFor(() => expect(loadWorkspaceAiSettingsAction).toHaveBeenCalledOnce());

    await user.click(within(dialog).getByRole("button", { name: "AI Settings" }));
    expect(within(dialog).getByText("Sales")).toBeInTheDocument();
    expect(within(dialog).queryByDisplayValue("workspace-a-model")).toBeNull();
    await user.click(within(dialog).getByRole("button", { name: "Save and test" }));

    expect(saveWorkspaceAiSettingsAction).toHaveBeenCalledOnce();
  });
});

function workspaceConnection(id: string, label: string, active: boolean) {
  return {
    active,
    baseUrl: `https://${label.toLowerCase()}.example.com`,
    id,
    label,
    providerKey: "example",
    providerLabel: "Example",
    status: "active" as const,
  };
}
