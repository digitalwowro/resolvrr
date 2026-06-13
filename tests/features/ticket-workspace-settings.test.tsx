import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultWorkspaceTicketColumns } from "@/features/tickets";
import { TicketWorkspace } from "@/features/workspace/components/ticket-workspace";
import type { ConnectionProviderOption } from "@/features/helpdesk-connections";
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

  it("shows and updates My Profile account details", async () => {
    const user = userEvent.setup();
    const updateProfileAction = vi.fn(async (formData: FormData) => {
      expect(formData.get("firstName")).toBe("Razvan");
      expect(formData.get("lastName")).toBe("Rosca");
      return {
        ok: true as const,
        code: "profile-updated" as const,
        user: {
          id: "user-1",
          email: "agent@example.com",
          displayName: "Razvan Rosca",
          firstName: "Razvan",
          lastName: "Rosca",
          avatarDataUrl: null,
          role: "ADMIN" as const,
        },
      };
    });
    const updateAvatarAction = vi.fn(async (formData: FormData) => {
      expect(formData.get("avatar")).toBeInstanceOf(File);
      return {
        ok: true as const,
        code: "avatar-updated" as const,
        user: {
          id: "user-1",
          email: "agent@example.com",
          displayName: "Razvan Rosca",
          firstName: "Razvan",
          lastName: "Rosca",
          avatarDataUrl: "data:image/png;base64,YXZhdGFy",
          role: "ADMIN" as const,
        },
      };
    });

    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        listResult={availableList}
        logoutAction={noopAction}
        rows={[row]}
        setActiveConnectionAction={noopAction}
        tabs={[{ ...row }]}
        updateAvatarAction={updateAvatarAction}
        updateProfileAction={updateProfileAction}
        updateTicketMetadataAction={noopMutationAction}
        userDisplayName="Agent Example"
        userEmail="agent@example.com"
        userFirstName="Agent"
        userLastName="Example"
        userRole="ADMIN"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Open profile menu, Support" }));
    await user.click(screen.getByRole("menuitem", { name: "Settings" }));
    const dialog = screen.getByRole("dialog", { name: "Settings" });
    await user.click(within(dialog).getByRole("button", { name: "My Profile" }));

    expect(within(dialog).getByText("agent@example.com")).toBeInTheDocument();
    expect(within(dialog).getByText("Admin")).toBeInTheDocument();

    expect(within(dialog).getByLabelText("Given name")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Family name")).toBeInTheDocument();

    const firstNameInput = within(dialog).getByLabelText("First name");
    const lastNameInput = within(dialog).getByLabelText("Last name");
    expect(firstNameInput).toHaveValue("Agent");
    expect(lastNameInput).toHaveValue("Example");
    await user.clear(firstNameInput);
    await user.type(firstNameInput, "Razvan");
    await user.clear(lastNameInput);
    await user.type(lastNameInput, "Rosca");
    await user.click(within(dialog).getByRole("button", { name: "Save profile" }));

    expect(updateProfileAction).toHaveBeenCalledTimes(1);
    expect(
      await within(dialog).findByText("Profile updated."),
    ).toBeInTheDocument();
    expect(firstNameInput).toHaveValue("Razvan");
    expect(lastNameInput).toHaveValue("Rosca");

    await user.click(within(dialog).getByRole("button", { name: "Workspaces" }));
    await user.click(within(dialog).getByRole("button", { name: "My Profile" }));
    expect(within(dialog).getByLabelText("First name")).toHaveValue("Razvan");
    expect(within(dialog).getByLabelText("Last name")).toHaveValue("Rosca");

    const avatarInput = within(dialog).getByLabelText(
      "Upload avatar",
    ) as HTMLInputElement;
    await user.upload(
      avatarInput,
      new File(["avatar"], "avatar.png", { type: "image/png" }),
    );

    expect(updateAvatarAction).toHaveBeenCalledTimes(1);
    expect(await within(dialog).findByText("Avatar updated.")).toBeInTheDocument();
  });

  it("changes the password from My Profile", async () => {
    const user = userEvent.setup();
    const changePasswordAction = vi.fn(async (formData: FormData) => {
      expect(formData.get("currentPassword")).toBe("old-long-password");
      expect(formData.get("newPassword")).toBe("new-long-password");
      expect(formData.get("confirmPassword")).toBe("new-long-password");
      return { ok: true as const, code: "password-changed" as const };
    });

    render(
      <TicketWorkspace
        changePasswordAction={changePasswordAction}
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
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
    await user.click(within(dialog).getByRole("button", { name: "My Profile" }));

    await user.type(
      within(dialog).getByLabelText("Current password"),
      "old-long-password",
    );
    await user.type(
      within(dialog).getByLabelText("New password"),
      "new-long-password",
    );
    await user.type(
      within(dialog).getByLabelText("Confirm new password"),
      "new-long-password",
    );
    await user.click(within(dialog).getByRole("button", { name: "Change password" }));

    expect(changePasswordAction).toHaveBeenCalledTimes(1);
    expect(
      await within(dialog).findByText(
        "Password changed. Other sessions were signed out.",
      ),
    ).toBeInTheDocument();
  });
});
