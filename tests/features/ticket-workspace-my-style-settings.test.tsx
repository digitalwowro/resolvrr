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

async function openSettings(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Open profile menu, Support" }));
  await user.click(screen.getByRole("menuitem", { name: "Settings" }));
  return screen.getByRole("dialog", { name: "Settings" });
}

describe("TicketWorkspace My Style settings", () => {
  it("loads, saves, and resets My Style when workspace AI is enabled", async () => {
    const user = userEvent.setup();
    const loadMyStyleAction = vi.fn(async () => ({
      activeWorkspace: { id: "connection-1", label: "Support" },
      canEdit: true,
      style: {
        audience: "Technical customers",
        constraints: "Avoid unsupported promises.",
        preferences: "Use short paragraphs.",
        role: "Support engineer",
        tone: "Warm",
      },
    }));
    const saveMyStyleAction = vi.fn(async (formData: FormData) => {
      expect(formData.get("role")).toBe("Escalation engineer");
      return {
        code: "my-style-saved" as const,
        data: {
          activeWorkspace: { id: "connection-1", label: "Support" },
          canEdit: true,
          style: {
            audience: "Technical customers",
            constraints: "Avoid unsupported promises.",
            preferences: "Use short paragraphs.",
            role: "Escalation engineer",
            tone: "Warm",
          },
        },
        ok: true,
      };
    });
    const resetMyStyleAction = vi.fn(async () => ({
      code: "my-style-reset" as const,
      data: {
        activeWorkspace: { id: "connection-1", label: "Support" },
        canEdit: true,
        style: {
          audience: "",
          constraints: "",
          preferences: "",
          role: "",
          tone: "",
        },
      },
      ok: true,
    }));

    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        initialAiSettingsData={{
          activeWorkspace: { id: "connection-1", label: "Support" },
          canManageWorkspace: false,
          canViewPromptCenter: false,
          policy: "admin-managed",
          userConfig: null,
          userPermissions: {
            canEditAiRephraseStyleOverrides: false,
            canEditMyStyle: true,
          },
          workspaceConfig: null,
          workspaceConfigConfigured: true,
        }}
        listResult={availableList}
        loadMyStyleAction={loadMyStyleAction}
        logoutAction={noopAction}
        resetMyStyleAction={resetMyStyleAction}
        rows={[row]}
        saveMyStyleAction={saveMyStyleAction}
        setActiveConnectionAction={noopAction}
        tabs={[{ ...row }]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="agent@example.com"
      />,
    );

    const dialog = await openSettings(user);
    expect(within(dialog).queryByLabelText("Role")).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "My Style" }));

    const roleInput = await within(dialog).findByLabelText("Role");
    expect(roleInput).toHaveValue("Support engineer");

    await user.clear(roleInput);
    await user.type(roleInput, "Escalation engineer");
    await user.click(within(dialog).getByRole("button", { name: "Save My Style" }));

    expect(saveMyStyleAction).toHaveBeenCalledTimes(1);
    expect(await within(dialog).findByText("My Style saved.")).toBeInTheDocument();
    expect(roleInput).toHaveValue("Escalation engineer");

    await user.click(within(dialog).getByRole("button", { name: "Reset" }));

    expect(resetMyStyleAction).toHaveBeenCalledTimes(1);
    expect(await within(dialog).findByText("My Style reset.")).toBeInTheDocument();
    expect(roleInput).toHaveValue("");
  });

  it("hides My Style when workspace AI is disabled", async () => {
    const user = userEvent.setup();
    const loadMyStyleAction = vi.fn(async () => ({
      activeWorkspace: { id: "connection-1", label: "Support" },
      canEdit: true,
      style: {
        audience: "",
        constraints: "",
        preferences: "",
        role: "",
        tone: "",
      },
    }));

    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        initialAiSettingsData={{
          activeWorkspace: { id: "connection-1", label: "Support" },
          canManageWorkspace: false,
          canViewPromptCenter: false,
          policy: "disabled",
          userConfig: null,
          userPermissions: {
            canEditAiRephraseStyleOverrides: false,
            canEditMyStyle: false,
          },
          workspaceConfig: null,
          workspaceConfigConfigured: false,
        }}
        listResult={availableList}
        loadMyStyleAction={loadMyStyleAction}
        logoutAction={noopAction}
        rows={[row]}
        setActiveConnectionAction={noopAction}
        tabs={[{ ...row }]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="agent@example.com"
      />,
    );

    const dialog = await openSettings(user);
    expect(within(dialog).queryByRole("button", { name: "My Style" }))
      .not.toBeInTheDocument();
    expect(loadMyStyleAction).not.toHaveBeenCalled();
  });
});
