import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  defaultWorkspaceTicketColumns,
  type SelectedTicketUpdatePayload,
  type TicketMetadataMutationActionState,
} from "@/features/tickets";
import { unsupportedTicketLookupList } from "@/core/ticket-lookups";
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
  options: { tagSuggestions?: "available" | "unsupported" } = {},
) {
  const detailProps = selectedDetailProps();
  const detail = {
    ...detailProps.detail,
    lookupData: {
      ...detailProps.detail.lookupData,
      tags:
        options.tagSuggestions === "unsupported"
          ? unsupportedTicketLookupList()
          : detailProps.detail.lookupData.tags,
    },
    links: [
      {
        id: "88",
        direction: "related" as const,
        label: "#88088 Linked ticket",
      },
    ],
    subscription: { supported: true, following: false },
    tags: ["vip"],
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
          priority: false,
          state: false,
          subscription: true,
          tags: true,
        },
      }}
      logoutAction={noopAction}
      rows={[row]}
      selectedTicketId="ticket-1"
      setActiveConnectionAction={noopAction}
      tabs={[row]}
      updateTicketMetadataAction={action}
      userEmail="agent@example.com"
    />,
  );
}

describe("TicketWorkspace secondary metadata updates", () => {
  it("submits staged tags, links, and subscription changes together", async () => {
    const user = userEvent.setup();
    const action = vi.fn<MutationAction>(async () => ({
      status: "saved" as const,
      field: "tags" as const,
      message: "Saved.",
    }));
    renderWorkspace(action);

    expect(screen.getByText("Subscribe to ticket")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove tag vip" }))
      .toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add link" })).toBeInTheDocument();
    expect(screen.getByText("#88088")).toBeInTheDocument();
    expect(screen.getByText("Linked ticket")).toBeInTheDocument();

    const subscriptionToggle = screen
      .getByRole("checkbox", { name: "Subscribed" })
      .closest("label");
    expect(subscriptionToggle).not.toBeNull();

    await user.click(subscriptionToggle as HTMLLabelElement);
    await user.click(screen.getByLabelText("Add tag"));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    await user.type(screen.getByLabelText("Add tag"), "h");
    expect(screen.getByRole("option", { name: "channel-operations" }))
      .toBeInTheDocument();
    expect(screen.getByRole("option", { name: "hello" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "high-priority" }))
      .toBeInTheDocument();
    await user.click(screen.getByRole("option", { name: "hello" }));
    await user.type(screen.getByLabelText("Add tag"), "renewal{Enter}");
    await user.click(screen.getByRole("button", { name: "Add link" }));
    await user.type(screen.getByLabelText("Related ticket ID"), "77");
    await user.click(
      screen.getByRole("button", { name: "Remove link #88088 Linked ticket" }),
    );

    expect(action).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Update" }));

    await waitFor(() => expect(routerRefresh).toHaveBeenCalledOnce());
    expect(action).toHaveBeenCalledOnce();
    expect(action.mock.calls[0]?.[0]).toEqual({
      metadata: {
        linkAddExternalId: "77",
        linkRemoveExternalIds: ["88"],
        subscriptionFollowing: true,
        tags: ["vip", "hello", "renewal"],
      },
      ticketExternalId: "ticket-1",
    });
  });

  it("keeps freeform tag editing available when suggestions are unsupported", async () => {
    const user = userEvent.setup();
    const action = vi.fn<MutationAction>(async () => ({
      status: "saved" as const,
      field: "tags" as const,
      message: "Saved.",
    }));
    renderWorkspace(action, { tagSuggestions: "unsupported" });

    await user.click(screen.getByLabelText("Add tag"));
    await user.type(screen.getByLabelText("Add tag"), "custom-tag{Enter}");

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Update" }));

    expect(action).toHaveBeenCalledWith({
      metadata: { tags: ["vip", "custom-tag"] },
      ticketExternalId: "ticket-1",
    });
  });
});
