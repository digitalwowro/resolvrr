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

const routerRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: routerRefresh,
  }),
}));

type MutationAction = (
  request: SelectedTicketUpdatePayload,
) => Promise<TicketMetadataMutationActionState>;

function renderWorkspace(
  action: MutationAction,
  options: {
    linkRelations?: boolean;
    searchTicketLinkTargetsAction?: SearchWorkspaceTicketLinkTargetsAction;
  } = {},
) {
  const detailProps = selectedDetailProps();
  const detail = {
    ...detailProps.detail,
    links: [],
    tags: [],
  };

  return render(
    <TicketWorkspace
      columns={defaultWorkspaceTicketColumns}
      connections={[{ id: "connection-1", label: "Support", active: true }]}
      detail={detail}
      detailResult={{ status: "available", detail }}
      listResult={{
        ...availableList,
        metadataMutationCapabilities: {
          links: true,
          linkRelations: options.linkRelations ?? true,
          priority: false,
          state: false,
        },
      }}
      logoutAction={noopAction}
      rows={[row]}
      searchTicketLinkTargetsAction={
        options.searchTicketLinkTargetsAction ??
        (async () => ({ status: "available" as const, targets: [] }))
      }
      selectedTicketId="ticket-1"
      setActiveConnectionAction={noopAction}
      tabs={[row]}
      updateTicketMetadataAction={action}
      userEmail="agent@example.com"
    />,
  );
}

describe("TicketWorkspace Add link modal", () => {
  it("searches link targets, renders context, and stages a selected parent link", async () => {
    const user = userEvent.setup();
    const action = vi.fn<MutationAction>(async () => ({
      status: "saved" as const,
      field: "links" as const,
      message: "Saved.",
    }));
    const searchAction = vi.fn<SearchWorkspaceTicketLinkTargetsAction>(
      async ({ query }) => ({
        status: "available" as const,
        targets: query
          ? [
              {
                customer: "Test Customer",
                externalId: "16004",
                number: "16004",
                priority: "medium",
                state: "open",
                title: "Open",
              },
            ]
          : [],
      }),
    );
    renderWorkspace(action, { searchTicketLinkTargetsAction: searchAction });

    await user.click(screen.getByRole("button", { name: "Add link" }));
    const dialog = screen.getByRole("dialog", { name: "Add ticket link" });
    expect(within(dialog).queryByText("#16004 Open")).not.toBeInTheDocument();
    expect(searchAction).not.toHaveBeenCalled();

    await user.type(within(dialog).getByLabelText("Search tickets"), "16004");

    expect(await within(dialog).findByText("#16004 Open")).toBeInTheDocument();
    expect(within(dialog).getByText("Test Customer · Open · Medium"))
      .toBeInTheDocument();
    expect(searchAction).toHaveBeenCalledWith({
      excludeTicketExternalId: "ticket-1",
      query: expect.stringContaining("16004"),
    });
    await user.click(within(dialog).getByText("#16004 Open"));
    await user.click(within(dialog).getByRole("radio", { name: /Parent/u }));
    await user.click(within(dialog).getByRole("button", { name: "Add link" }));

    expect(action).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Update" }));

    await waitFor(() => expect(action).toHaveBeenCalledOnce());
    expect(action.mock.calls[0]?.[0]).toMatchObject({
      metadata: {
        linkAddExternalId: "16004",
        linkAddRelation: "parent",
      },
      ticketExternalId: "ticket-1",
    });
  });

  it("keeps parent and child relation choices disabled without relation support", async () => {
    const user = userEvent.setup();
    renderWorkspace(vi.fn<MutationAction>(), { linkRelations: false });

    await user.click(screen.getByRole("button", { name: "Add link" }));
    const dialog = screen.getByRole("dialog", { name: "Add ticket link" });

    expect(within(dialog).getByRole("radio", { name: /Normal \/ Related/u }))
      .toBeChecked();
    expect(within(dialog).getByRole("radio", { name: /Parent/u }))
      .toBeDisabled();
    expect(within(dialog).getByRole("radio", { name: /Child/u })).toBeDisabled();
  });

  it("allows manual normal link staging when provider search is unsupported", async () => {
    const user = userEvent.setup();
    const action = vi.fn<MutationAction>(async () => ({
      status: "saved" as const,
      field: "links" as const,
      message: "Saved.",
    }));
    renderWorkspace(action, {
      searchTicketLinkTargetsAction: async () => ({
        status: "unavailable" as const,
        reason: "unsupported-capability" as const,
        retryable: false,
      }),
    });

    await user.click(screen.getByRole("button", { name: "Add link" }));
    const dialog = screen.getByRole("dialog", { name: "Add ticket link" });
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

  it("resets the relation after removing a staged pending link", async () => {
    const user = userEvent.setup();
    renderWorkspace(vi.fn<MutationAction>());

    await user.click(screen.getByRole("button", { name: "Add link" }));
    const dialog = screen.getByRole("dialog", { name: "Add ticket link" });
    await user.click(within(dialog).getByRole("radio", { name: /Child/u }));
    await user.type(within(dialog).getByLabelText("Manual related ticket ID"), "77");
    await user.click(within(dialog).getByRole("button", { name: "Add link" }));

    expect(screen.getByText(/#77 · Child/u)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remove staged link 77" }));

    await user.click(screen.getByRole("button", { name: "Add link" }));
    const reopenedDialog = screen.getByRole("dialog", { name: "Add ticket link" });

    expect(
      within(reopenedDialog).getByRole("radio", { name: /Normal \/ Related/u }),
    ).toBeChecked();
    expect(within(reopenedDialog).getByRole("radio", { name: /Child/u }))
      .not.toBeChecked();
  });
});
