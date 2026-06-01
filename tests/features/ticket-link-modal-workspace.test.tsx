import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  defaultWorkspaceTicketColumns,
  type LoadWorkspaceTicketDetailAction,
  type SearchWorkspaceTicketLinkTargetsAction,
  type SelectedTicketUpdatePayload,
  type TicketMetadataMutationActionState,
  type WorkspaceTicketDetail,
  type WorkspaceTicketRow,
  type WorkspaceTicketTab,
} from "@/features/tickets";
import { TicketWorkspace } from "@/features/workspace/components/ticket-workspace";
import {
  availableList,
  detailPropsFor,
  highRow,
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
    detail?: WorkspaceTicketDetail;
    linkRelations?: boolean;
    loadTicketDetailAction?: LoadWorkspaceTicketDetailAction;
    rows?: WorkspaceTicketRow[];
    searchTicketLinkTargetsAction?: SearchWorkspaceTicketLinkTargetsAction;
    tabs?: WorkspaceTicketTab[];
  } = {},
) {
  const detailProps = selectedDetailProps();
  const detail = {
    ...detailProps.detail,
    ...options.detail,
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
      loadTicketDetailAction={options.loadTicketDetailAction}
      logoutAction={noopAction}
      rows={options.rows ?? [row]}
      searchTicketLinkTargetsAction={
        options.searchTicketLinkTargetsAction ??
        (async () => ({ status: "available" as const, targets: [] }))
      }
      selectedTicketId="ticket-1"
      setActiveConnectionAction={noopAction}
      tabs={options.tabs ?? [row]}
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
    expect(within(dialog).queryByRole("region", { name: "From this customer" }))
      .not.toBeInTheDocument();
    expect(within(dialog).queryByText("#16004 Open")).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText("Manual related ticket ID"))
      .not.toBeInTheDocument();
    expect(searchAction).not.toHaveBeenCalled();

    await user.type(within(dialog).getByLabelText("Search tickets"), "16004");

    expect(await within(dialog).findByText("#16004 Open")).toBeInTheDocument();
    expect(within(dialog).getByText("Test Customer · Open · Medium"))
      .toBeInTheDocument();
    expect(within(dialog).queryByLabelText("Manual related ticket ID"))
      .not.toBeInTheDocument();
    expect(searchAction).toHaveBeenCalledWith({
      excludeTicketExternalId: "ticket-1",
      query: expect.stringContaining("16004"),
    });
    await user.click(within(dialog).getByText("#16004 Open"));
    await chooseRelation(user, dialog, "Parent");
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

  it("renders same-customer candidates and stages the selected link", async () => {
    const user = userEvent.setup();
    const action = vi.fn<MutationAction>(async () => ({
      status: "saved" as const,
      field: "links" as const,
      message: "Saved.",
    }));
    const searchAction = vi.fn<SearchWorkspaceTicketLinkTargetsAction>(
      async ({ customerExternalId }) => ({
        status: "available" as const,
        targets:
          customerExternalId === "customer-1"
            ? [
                {
                  customer: "Maya Patel",
                  externalId: "77",
                  number: "77",
                  priority: "medium",
                  state: "open",
                  title: "Same customer ticket",
                },
              ]
            : [],
      }),
    );
    const detail = {
      ...detailPropsFor(row).detail,
      customerExternalId: "customer-1",
    };
    renderWorkspace(action, {
      detail,
      searchTicketLinkTargetsAction: searchAction,
    });

    await user.click(screen.getByRole("button", { name: "Add link" }));
    const dialog = screen.getByRole("dialog", { name: "Add ticket link" });
    const customerSection = within(dialog).getByRole("region", {
      name: "From this customer",
    });

    expect(await within(customerSection).findByText("#77 Same customer ticket"))
      .toBeInTheDocument();
    expect(searchAction).toHaveBeenCalledWith({
      customerExternalId: "customer-1",
      excludeTicketExternalId: "ticket-1",
    });

    await user.click(within(customerSection).getByText("#77 Same customer ticket"));
    await user.click(within(dialog).getByRole("button", { name: "Add link" }));

    expect(action).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Update" }));

    await waitFor(() => expect(action).toHaveBeenCalledOnce());
    expect(action.mock.calls[0]?.[0]).toMatchObject({
      metadata: {
        linkAddExternalId: "77",
      },
      ticketExternalId: "ticket-1",
    });
  });

  it("stages a recently viewed candidate and excludes the current and selected targets", async () => {
    const user = userEvent.setup();
    const action = vi.fn<MutationAction>(async () => ({
      status: "saved" as const,
      field: "links" as const,
      message: "Saved.",
    }));
    const secondDetail = detailPropsFor(highRow).detail;
    const loadDetailAction = vi.fn<LoadWorkspaceTicketDetailAction>(
      async () => ({ status: "available" as const, detail: secondDetail }),
    );
    renderWorkspace(action, {
      loadTicketDetailAction: loadDetailAction,
      rows: [row, highRow],
      tabs: [row],
    });

    await user.click(screen.getByRole("tab", { name: /Return to list/u }));
    await user.click(await screen.findByRole("button", { name: /Webhook failed/u }));
    await screen.findByRole("button", { name: "Add link" });

    await user.click(screen.getByRole("button", { name: "Add link" }));
    const dialog = screen.getByRole("dialog", { name: "Add ticket link" });
    const recentSection = within(dialog).getByRole("region", {
      name: "Recently viewed",
    });

    expect(within(recentSection).queryByText("#1002 Webhook failed"))
      .not.toBeInTheDocument();
    expect(await within(recentSection).findByText("#1001 Cannot log in"))
      .toBeInTheDocument();

    await user.click(within(recentSection).getByText("#1001 Cannot log in"));
    expect(within(recentSection).queryByText("#1001 Cannot log in"))
      .not.toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Add link" }));
    await user.click(screen.getByRole("button", { name: "Update" }));

    await waitFor(() => expect(action).toHaveBeenCalledOnce());
    expect(action.mock.calls[0]?.[0]).toMatchObject({
      metadata: {
        linkAddExternalId: "ticket-1",
      },
      ticketExternalId: "ticket-2",
    });
  });

  it("keeps parent and child relation choices disabled without relation support", async () => {
    const user = userEvent.setup();
    renderWorkspace(vi.fn<MutationAction>(), { linkRelations: false });

    await user.click(screen.getByRole("button", { name: "Add link" }));
    const dialog = screen.getByRole("dialog", { name: "Add ticket link" });

    expect(within(dialog).getByRole("combobox", { name: "Relationship" }))
      .toHaveTextContent("Normal / Related");
    await user.click(within(dialog).getByRole("combobox", { name: "Relationship" }));
    expect(within(dialog).getByRole("option", { name: "Parent" }))
      .toBeDisabled();
    expect(within(dialog).getByRole("option", { name: "Child" })).toBeDisabled();
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
