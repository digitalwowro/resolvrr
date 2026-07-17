import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultWorkspaceTicketColumns } from "@/features/tickets";
import {
  TicketWorkspace,
  workspaceSavedViewOptionsFromSettingsData,
} from "@/features/workspace/components/ticket-workspace";
import { workspaceSavedViewOptions } from "@/features/workspace/components/ticket-workspace-saved-view-options";
import {
  availableList,
  highRow,
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

describe("TicketWorkspace saved views", () => {
  beforeEach(() => {
    routerPush.mockClear();
    routerRefresh.mockClear();
  });

  it("loads and selects a persisted saved view from the workspace selector", async () => {
    const user = userEvent.setup();
    const saveWorkspaceSelectedSavedViewAction = vi.fn(async () => ({
      status: "saved" as const,
    }));
    const loadTicketListPageAction = vi.fn(async () => ({
      status: "available" as const,
      rows: [highRow],
      loadedCount: 1,
      appliedSavedViewId: "view-1",
    }));

    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        listResult={availableList}
        loadTicketListPageAction={loadTicketListPageAction}
        logoutAction={noopAction}
        rows={[row]}
        savedViews={[
          { id: "all-tickets", label: "All tickets" },
          { id: "view-1", label: "Open priority" },
        ]}
        saveWorkspaceSelectedSavedViewAction={
          saveWorkspaceSelectedSavedViewAction
        }
        selectedSavedViewId="all-tickets"
        setActiveConnectionAction={noopAction}
        tabs={[{ ...row }]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="agent@example.com"
      />,
    );

    await user.click(screen.getByRole("combobox", { name: "Saved view" }));
    await user.click(screen.getByRole("option", { name: "Open priority" }));

    expect(loadTicketListPageAction).toHaveBeenCalledWith({
      savedViewId: "view-1",
    });
    expect(saveWorkspaceSelectedSavedViewAction).toHaveBeenCalledWith("view-1");
    expect(await screen.findByText("Webhook failed")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Saved view" })).toHaveTextContent(
      "Open priority",
    );
  });

  it("shows unsupported saved views as disabled options", async () => {
    const user = userEvent.setup();

    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        listResult={availableList}
        logoutAction={noopAction}
        rows={[row]}
        savedViews={[
          { id: "all-tickets", label: "All tickets" },
          {
            id: "view-2",
            label: "Full text",
            disabledLabel: "search unsupported",
            disabledReason: "full-text-search-unsupported",
          },
        ]}
        selectedSavedViewId="all-tickets"
        setActiveConnectionAction={noopAction}
        tabs={[{ ...row }]}
        updateTicketMetadataAction={noopMutationAction}
        userEmail="agent@example.com"
      />,
    );

    await user.click(screen.getByRole("combobox", { name: "Saved view" }));

    const listbox = screen.getByRole("listbox");
    expect(
      within(listbox).getByRole("option", {
        name: "Full text (search unsupported)",
      }),
    ).toBeDisabled();
  });

  it("enriches initial view data with provider groups when Views opens", async () => {
    const user = userEvent.setup();
    const initialData = {
      views: [],
      ownerOptions: [],
      groupOptions: [],
      canManageShared: false,
    };
    const loadSavedViewsSettingsAction = vi.fn(async () => ({
      ...initialData,
      groupOptions: [{ externalId: "group-1", label: "Support" }],
    }));

    render(
      <TicketWorkspace
        columns={defaultWorkspaceTicketColumns}
        connections={[{ id: "connection-1", label: "Support", active: true }]}
        initialSavedViewSettingsData={initialData}
        listResult={availableList}
        loadSavedViewsSettingsAction={loadSavedViewsSettingsAction}
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
    await user.click(within(dialog).getByRole("button", { name: "Views" }));
    await vi.waitFor(() => expect(loadSavedViewsSettingsAction).toHaveBeenCalledOnce());
    await user.click(within(dialog).getByRole("button", { name: "Add condition" }));
    await user.click(within(dialog).getByRole("combobox", { name: "Condition field" }));
    await user.click(screen.getByRole("option", { name: "Group" }));
    await user.click(within(dialog).getByRole("combobox", { name: "group condition value" }));

    expect(screen.getByRole("option", { name: "Support" })).toBeInTheDocument();
  });

  it("preserves unsupported saved-view option metadata after settings refresh", () => {
    expect(
      workspaceSavedViewOptionsFromSettingsData(
        {
          views: [
            {
              id: "view-2",
              name: "Full text",
              visibility: "personal",
              isDefault: false,
              position: 0,
              conditions: [],
            },
          ],
          ownerOptions: [],
          groupOptions: [],
          canManageShared: false,
        },
        [
          {
            id: "view-2",
            label: "Full text",
            query: { filter: { searchText: "billing" } },
            disabledLabel: "search unsupported",
            disabledReason: "full-text-search-unsupported",
          },
        ],
        {
          totalCount: true,
          providerSort: true,
          providerGrouping: true,
          groupedTotalCount: true,
          fullTextSearch: false,
          maxPageSize: 50,
          unsupportedCombinations: [],
        },
      ),
    ).toEqual([
      {
        id: "view-2",
        label: "Full text",
        isDefault: false,
        query: { filter: { searchText: "billing" } },
        disabledLabel: "search unsupported",
        disabledReason: "full-text-search-unsupported",
      },
    ]);
  });

  it("adds icons to every saved-view dropdown option", () => {
    expect(
      workspaceSavedViewOptions([
        { id: "all-tickets", label: "All tickets" },
        { id: "my-work", label: "My work", iconName: "inbox" },
      ]).map((option) => Boolean(option.icon)),
    ).toEqual([true, true]);
  });
});
