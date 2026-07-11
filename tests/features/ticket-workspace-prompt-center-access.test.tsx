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

describe("TicketWorkspace Prompt Center access", () => {
  beforeEach(() => {
    routerPush.mockClear();
    routerRefresh.mockClear();
  });

  it("shows only personal rephrase overrides to permitted non-admins", async () => {
    const user = userEvent.setup();
    const activeWorkspace = {
      access: {
        canEditAiRephraseStyleOverrides: true,
        canEditMyStyle: false,
        role: "AGENT" as const,
      },
      id: "connection-1",
      label: "Support",
    };
    const promptCenterData = (prompt = "Personal concise prompt.") => ({
      activeWorkspace,
      adminPrompts: [],
      canManageWorkspace: false,
      canView: true,
      policy: "admin-managed" as const,
      userRephraseStyleOverrides: [
        {
          defaultPrompt: "Workspace concise prompt.",
          id: "style-concise",
          isCustomized: true,
          label: "Concise",
          maxLength: 2_000,
          prompt,
        },
      ],
      workspaceRephraseStyles: [],
    });
    const loadAiPromptCenterAction = vi.fn(async () => promptCenterData());
    const saveUserAiRephraseStyleOverrideAction = vi.fn(async (formData: FormData) => {
      expect(formData.get("styleId")).toBe("style-concise");
      expect(formData.get("prompt")).toBe("My personal concise prompt.");
      return {
        code: "ai-rephrase-style-override-saved" as const,
        data: promptCenterData("My personal concise prompt."),
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
          canViewPromptCenter: true,
          policy: "admin-managed",
          userConfig: null,
          userPermissions: {
            canEditAiRephraseStyleOverrides: true,
            canEditMyStyle: false,
          },
          workspaceConfig: null,
          workspaceConfigConfigured: true,
        }}
        listResult={availableList}
        loadAiPromptCenterAction={loadAiPromptCenterAction}
        logoutAction={noopAction}
        rows={[row]}
        saveUserAiRephraseStyleOverrideAction={saveUserAiRephraseStyleOverrideAction}
        setActiveConnectionAction={noopAction}
        tabs={[{ ...row }]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="agent@example.com"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Open profile menu, Support" }));
    await user.click(screen.getByRole("menuitem", { name: "Settings" }));
    const dialog = screen.getByRole("dialog", { name: "Settings" });
    await user.click(within(dialog).getByRole("button", { name: "Prompt Center" }));

    expect(await within(dialog).findByText("Personal overrides")).toBeInTheDocument();
    expect(within(dialog).queryByText("Workspace prompts")).not.toBeInTheDocument();
    const prompt = await within(dialog).findByLabelText("Personal style prompt");
    await user.clear(prompt);
    await user.type(prompt, "My personal concise prompt.");
    await user.click(within(dialog).getByRole("button", { name: "Save personal style" }));
    expect(saveUserAiRephraseStyleOverrideAction).toHaveBeenCalledOnce();
  });

  it("hides Prompt Center from non-admins without personal style override access", async () => {
    const user = userEvent.setup();

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
            canEditMyStyle: false,
          },
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
