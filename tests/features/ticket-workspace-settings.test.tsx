import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultWorkspaceTicketColumns } from "@/features/tickets";
import { TicketWorkspace } from "@/features/workspace/components/ticket-workspace";
import type { ConnectionProviderOption } from "@/features/helpdesk-connections";
import type { UserManagementData } from "@/features/user-management";
import {
  availableList,
  noopAction,
  noopMutationAction,
  row,
} from "./ticket-workspace-test-utils";

const routerPush = vi.fn();
const routerRefresh = vi.fn();

const providerOptions: ConnectionProviderOption[] = [
  {
    key: "example",
    label: "Example",
    credentialSchemes: [
      {
        key: "basic-auth",
        label: "Basic Auth",
        fields: [
          { name: "username", label: "Username", type: "text", required: true },
          {
            name: "password",
            label: "Password",
            type: "password",
            required: true,
          },
        ],
      },
    ],
  },
];

const userManagementData: UserManagementData = {
  currentUserId: "admin-1",
  users: [
    {
      createdAt: "2026-06-18T00:00:00.000Z",
      deactivatedAt: null,
      email: "agent@example.com",
      firstName: "Agent",
      hasProviderMutations: false,
      id: "agent-1",
      lastName: "User",
      memberships: [],
      ownedWorkspaceIds: [],
      role: "USER",
      status: "active",
      workspaceAccessCount: 1,
    },
  ],
  workspaces: [{ id: "connection-1", label: "Support", ownerUserId: "admin-1" }],
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPush,
    refresh: routerRefresh,
  }),
}));

describe("TicketWorkspace settings", () => {
  beforeEach(() => {
    routerPush.mockClear();
    routerRefresh.mockClear();
  });

  it("opens Settings Views from the avatar and updates the default in place", async () => {
    const user = userEvent.setup();
    const initialSavedViewSettingsData = {
      views: [
        {
          id: "view-1",
          name: "My work",
          visibility: "personal" as const,
          iconName: "briefcase-business",
          colorName: "blue" as const,
          seedKey: "my-work",
          isDefault: true,
          position: 0,
          conditions: [
            {
              id: "owner-myself",
              field: "owner" as const,
              operator: "is" as const,
              values: [{ kind: "owner-preset" as const, value: "myself" as const }],
            },
            {
              id: "state-not-closed",
              field: "state" as const,
              operator: "is_not" as const,
              values: [{ kind: "state" as const, value: "closed" as const }],
            },
          ],
        },
        {
          id: "view-2",
          name: "Escalations",
          visibility: "personal" as const,
          iconName: "signal-high",
          colorName: "rose" as const,
          isDefault: false,
          position: 1,
          conditions: [
            {
              id: "priority-high",
              field: "priority" as const,
              operator: "is" as const,
              values: [{ kind: "priority" as const, value: "high" as const }],
            },
          ],
        },
      ],
      defaultSavedViewId: "view-1",
      ownerOptions: [],
      groupOptions: [],
      canManageShared: false,
    };
    const setDefaultSavedViewAction = vi.fn(async () => ({
      ok: true,
      code: "default-set" as const,
      data: {
        ...initialSavedViewSettingsData,
        defaultSavedViewId: "view-2",
        views: initialSavedViewSettingsData.views.map((view) => ({
          ...view,
          isDefault: view.id === "view-2",
        })),
      },
    }));

    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        initialSavedViewSettingsData={initialSavedViewSettingsData}
        listResult={availableList}
        logoutAction={noopAction}
        rows={[row]}
        savedViews={[
          { id: "view-1", label: "My work", isDefault: true },
          { id: "view-2", label: "Escalations" },
        ]}
        setActiveConnectionAction={noopAction}
        setDefaultSavedViewAction={setDefaultSavedViewAction}
        tabs={[{ ...row }]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="agent@example.com"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Open profile menu, Support" }));
    await user.click(screen.getByRole("menuitem", { name: "Settings" }));
    const dialog = screen.getByRole("dialog", { name: "Settings" });
    await user.click(within(dialog).getByRole("button", { name: "Views" }));
    await user.click(within(dialog).getByText("Escalations"));
    await user.click(within(dialog).getByRole("button", { name: "Set default" }));

    expect(setDefaultSavedViewAction).toHaveBeenCalledWith("view-2");
    expect(await within(dialog).findByText("Default view updated.")).toBeInTheDocument();
    expect(routerPush).not.toHaveBeenCalled();
    expect(routerRefresh).not.toHaveBeenCalled();
  });

  it("creates the first workspace from settings without redirecting", async () => {
    const user = userEvent.setup();
    const createConnectionAction = vi.fn(async (formData: FormData) => {
      expect(formData.get("displayName")).toBe("Support");
      expect(formData.get("providerKey")).toBe("example");
      expect(formData.get("baseUrl")).toBe("https://example.com");
      expect(formData.get("credentialScheme")).toBe("basic-auth");
      expect(formData.get("username")).toBe("agent");
      expect(formData.get("password")).toBe("secret");
      return {
        ok: true,
        code: "created" as const,
        connections: [
          {
            id: "connection-1",
            label: "Support",
            providerKey: "example",
            providerLabel: "Example",
            baseUrl: "https://example.com",
            status: "active" as const,
            active: true,
          },
        ],
      };
    });

    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connectionProviderOptions={providerOptions}
        connections={[]}
        createConnectionAction={createConnectionAction}
        listResult={{
          status: "unavailable",
          reason: "no-active-connection",
          retryable: false,
        }}
        logoutAction={noopAction}
        rows={[]}
        setActiveConnectionAction={noopAction}
        tabs={[]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="agent@example.com"
      />,
    );

    await user.click(screen.getByRole("button", { name: "here" }));
    const dialog = screen.getByRole("dialog", { name: "Settings" });
    await user.click(within(dialog).getByRole("button", { name: "Add workspace" }));
    await user.type(within(dialog).getByLabelText("Workspace name"), "Support");
    await user.type(within(dialog).getByLabelText("Base URL"), "https://example.com");
    await user.type(within(dialog).getByLabelText("Username"), "agent");
    await user.type(within(dialog).getByLabelText("Password"), "secret");
    await user.click(
      within(dialog).getByRole("button", { name: "Connect workspace" }),
    );

    expect(createConnectionAction).toHaveBeenCalledTimes(1);
    expect(await within(dialog).findByText("Workspace connected.")).toBeInTheDocument();
    expect(within(dialog).getByText("Support")).toBeInTheDocument();
    expect(routerRefresh).toHaveBeenCalled();
  });

  it("shows user management to admins only", async () => {
    const user = userEvent.setup();

    const { rerender } = render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        loadUserManagementAction={async () => userManagementData}
        listResult={availableList}
        logoutAction={noopAction}
        rows={[row]}
        savedViews={[]}
        setActiveConnectionAction={noopAction}
        tabs={[{ ...row }]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="admin@example.com"
        userId="admin-1"
        userRole="ADMIN"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Open profile menu, Support" }));
    await user.click(screen.getByRole("menuitem", { name: "Settings" }));
    const dialog = screen.getByRole("dialog", { name: "Settings" });
    await user.click(within(dialog).getByRole("button", { name: "Users" }));

    expect(within(dialog).getByRole("heading", { name: "Users" })).toBeInTheDocument();
    expect(within(dialog).getByText("Agent User")).toBeInTheDocument();
    expect(within(dialog).getByText("agent@example.com")).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Close settings" }));
    rerender(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        loadUserManagementAction={async () => userManagementData}
        listResult={availableList}
        logoutAction={noopAction}
        rows={[row]}
        savedViews={[]}
        setActiveConnectionAction={noopAction}
        tabs={[{ ...row }]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="user@example.com"
        userId="user-1"
        userRole="USER"
      />,
    );
    await user.click(screen.getByRole("button", { name: "Open profile menu, Support" }));
    await user.click(screen.getByRole("menuitem", { name: "Settings" }));

    expect(screen.queryByRole("button", { name: "Users" })).not.toBeInTheDocument();
  });
});
