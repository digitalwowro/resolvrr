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

async function openProfileSettings(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Open profile menu, Support" }));
  await user.click(screen.getByRole("menuitem", { name: "Settings" }));
  const dialog = screen.getByRole("dialog", { name: "Settings" });
  await user.click(within(dialog).getByRole("button", { name: "My Profile" }));
  return dialog;
}

describe("TicketWorkspace profile settings", () => {
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

    const dialog = await openProfileSettings(user);

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
    expect(await within(dialog).findByText("Profile updated.")).toBeInTheDocument();
    expect(firstNameInput).toHaveValue("Razvan");
    expect(lastNameInput).toHaveValue("Rosca");

    await user.click(within(dialog).getByRole("button", { name: "Workspaces" }));
    await user.click(within(dialog).getByRole("button", { name: "My Profile" }));
    expect(within(dialog).getByLabelText("First name")).toHaveValue("Razvan");
    expect(within(dialog).getByLabelText("Last name")).toHaveValue("Rosca");

    await user.upload(
      within(dialog).getByLabelText("Upload avatar") as HTMLInputElement,
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

    const dialog = await openProfileSettings(user);
    await user.type(within(dialog).getByLabelText("Current password"), "old-long-password");
    await user.type(within(dialog).getByLabelText("New password"), "new-long-password");
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
