import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  defaultWorkspaceTicketColumns,
  type SearchWorkspaceTicketLinkTargetsAction,
  type SelectedTicketUpdatePayload,
  type TicketMetadataMutationActionState,
} from "@/features/tickets";
import { TicketWorkspace } from "@/features/workspace/components/ticket-workspace";
import {
  availableList,
  noopAction,
  row,
  selectedDetailProps,
} from "./ticket-workspace-test-utils";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

type MutationAction = (
  request: SelectedTicketUpdatePayload,
) => Promise<TicketMetadataMutationActionState>;

function renderWorkspace(
  action: MutationAction,
  searchTicketLinkTargetsAction: SearchWorkspaceTicketLinkTargetsAction = async () => ({
    status: "available" as const,
    targets: [],
  }),
) {
  const detailProps = selectedDetailProps();
  return render(
    <TicketWorkspace
      columns={defaultWorkspaceTicketColumns}
      connections={[{ id: "connection-1", label: "Support", active: true }]}
      detail={{
        ...detailProps.detail,
        links: [],
        tags: [],
      }}
      detailResult={{ status: "available", detail: detailProps.detail }}
      listResult={{
        ...availableList,
        metadataMutationCapabilities: {
          links: true,
          linkRelations: true,
          priority: false,
          state: false,
        },
      }}
      logoutAction={noopAction}
      rows={[row]}
      searchTicketLinkTargetsAction={searchTicketLinkTargetsAction}
      selectedTicketId="ticket-1"
      setActiveConnectionAction={noopAction}
      tabs={[row]}
      updateTicketMetadataAction={action}
      userEmail="agent@example.com"
    />,
  );
}

async function chooseRelation(
  user: ReturnType<typeof userEvent.setup>,
  dialog: HTMLElement,
  relation: "Parent" | "Child" | "Normal / Related",
) {
  await user.click(within(dialog).getByRole("combobox", { name: "Relationship" }));
  await user.click(within(dialog).getByRole("option", { name: relation }));
}

describe("TicketWorkspace Add link modal manual fallback", () => {
  it("allows manual normal link staging when provider search is unsupported", async () => {
    const user = userEvent.setup();
    const action = vi.fn<MutationAction>(async () => ({
      status: "saved" as const,
      field: "links" as const,
      message: "Saved.",
    }));
    renderWorkspace(action, async () => ({
      status: "unavailable" as const,
      reason: "unsupported-capability" as const,
      retryable: false,
    }));

    await user.click(screen.getByRole("button", { name: "Add link" }));
    const dialog = screen.getByRole("dialog", { name: "Add ticket link" });
    expect(within(dialog).queryByLabelText("Manual related ticket ID"))
      .not.toBeInTheDocument();
    await user.type(within(dialog).getByLabelText("Search tickets"), "16004");
    expect(
      await within(dialog).findByText(/Search is unavailable for this workspace/u),
    ).toBeInTheDocument();
    await user.type(within(dialog).getByLabelText("Manual related ticket ID"), "77");
    await user.click(within(dialog).getByRole("button", { name: "Add link" }));
    await user.click(screen.getByRole("button", { name: "Update" }));

    await waitFor(() => expect(action).toHaveBeenCalledOnce());
    expect(action.mock.calls[0]?.[0]).toMatchObject({
      metadata: {
        linkAddExternalId: "77",
        linkAddRelation: "related",
      },
    });
  });

  it("shows manual normal link fallback when search has no matches", async () => {
    const user = userEvent.setup();
    const action = vi.fn<MutationAction>(async () => ({
      status: "saved" as const,
      field: "links" as const,
      message: "Saved.",
    }));
    renderWorkspace(action);

    await user.click(screen.getByRole("button", { name: "Add link" }));
    const dialog = screen.getByRole("dialog", { name: "Add ticket link" });
    expect(within(dialog).queryByLabelText("Manual related ticket ID"))
      .not.toBeInTheDocument();

    await user.type(within(dialog).getByLabelText("Search tickets"), "missing");

    expect(
      await within(dialog).findByText(/No matching tickets found/u),
    ).toBeInTheDocument();
    await user.type(within(dialog).getByLabelText("Manual related ticket ID"), "77");
    await user.click(within(dialog).getByRole("button", { name: "Add link" }));
    await user.click(screen.getByRole("button", { name: "Update" }));

    await waitFor(() => expect(action).toHaveBeenCalledOnce());
    expect(action.mock.calls[0]?.[0]).toMatchObject({
      metadata: {
        linkAddExternalId: "77",
        linkAddRelation: "related",
      },
    });
  });

  it("resets the relation after removing a staged pending link", async () => {
    const user = userEvent.setup();
    renderWorkspace(vi.fn<MutationAction>());

    await user.click(screen.getByRole("button", { name: "Add link" }));
    const dialog = screen.getByRole("dialog", { name: "Add ticket link" });
    await chooseRelation(user, dialog, "Child");
    await user.type(within(dialog).getByLabelText("Search tickets"), "missing");
    expect(
      await within(dialog).findByText(/No matching tickets found/u),
    ).toBeInTheDocument();
    await user.type(within(dialog).getByLabelText("Manual related ticket ID"), "77");
    await user.click(within(dialog).getByRole("button", { name: "Add link" }));

    expect(screen.getByText(/#77 · Child/u)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remove staged link 77" }));

    await user.click(screen.getByRole("button", { name: "Add link" }));
    const reopenedDialog = screen.getByRole("dialog", { name: "Add ticket link" });

    expect(
      within(reopenedDialog).getByRole("combobox", { name: "Relationship" }),
    ).toHaveTextContent("Normal / Related");
  });
});
