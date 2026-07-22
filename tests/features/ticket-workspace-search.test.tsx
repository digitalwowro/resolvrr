import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { WorkspaceTicketRow } from "@/features/tickets/workspace-adapter";
import type { SearchWorkspaceTicketsAction } from "@/features/tickets/search-action-result";
import { useTicketSearchController } from "@/features/workspace/components/use-ticket-search-controller";
import { WorkspaceTicketSearch } from "@/features/workspace/components/workspace-ticket-search";

const row: WorkspaceTicketRow = {
  id: "42",
  number: "#1042",
  title: "Billing question",
  customer: "Customer",
  owner: "Agent",
  group: "Support",
  state: "Open",
  priority: "Medium",
  pendingTill: "-",
  updatedAt: "now",
};

const defaultScope = {
  userId: "user-1",
  workspaceId: "workspace-1",
  helpdeskConnectionId: "connection-1",
  identityVersion: "identity-1",
};

describe("WorkspaceTicketSearch", () => {
  it("anchors accessible quick results to the search field and supports keyboard selection", () => {
    const onSelectTicket = vi.fn();
    render(
      <WorkspaceTicketSearch
        enabled
        loading={false}
        onQueryChange={vi.fn()}
        onSelectTicket={onSelectTicket}
        onSubmit={vi.fn()}
        query="billing"
        rows={[row]}
        totalCount={1}
      />,
    );

    const input = screen.getByRole("combobox", { name: "Search all tickets" });
    fireEvent.focus(input);
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Billing question/u })).toBeInTheDocument();
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSelectTicket).toHaveBeenCalledWith("42");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("closes the quick-result picker when detailed results are requested", () => {
    const onSubmit = vi.fn();
    render(
      <WorkspaceTicketSearch
        enabled
        loading={false}
        onQueryChange={vi.fn()}
        onSelectTicket={vi.fn()}
        onSubmit={onSubmit}
        query="billing"
        rows={[row]}
        totalCount={1}
      />,
    );

    const input = screen.getByRole("combobox", { name: "Search all tickets" });
    fireEvent.focus(input);
    fireEvent.click(screen.getByRole("button", { name: /View all results/u }));

    expect(onSubmit).toHaveBeenCalledOnce();
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(input).not.toHaveFocus();
  });
});

function SearchControllerHarness({
  action,
  scope,
}: {
  action: SearchWorkspaceTicketsAction;
  scope?: {
    userId: string;
    workspaceId: string;
    helpdeskConnectionId: string;
    identityVersion: string;
  };
}) {
  const search = useTicketSearchController({ action, scope });
  return (
    <>
      <input
        aria-label="Query"
        onChange={(event) => search.setQuery(event.currentTarget.value)}
        value={search.query}
      />
      <button onClick={search.submitDetailed} type="button">
        Submit
      </button>
      <button onClick={search.clear} type="button">
        Clear
      </button>
      <output data-testid="quick">{search.quickRows.map((item) => item.id).join(",")}</output>
      <output data-testid="detailed">
        {search.detailedActive
          ? search.detailedRows.map((item) => item.id).join(",")
          : "inactive"}
      </output>
    </>
  );
}

describe("useTicketSearchController", () => {
  it("debounces quick search, opens detailed results, and restores the list on clear", async () => {
    const action = vi.fn<SearchWorkspaceTicketsAction>(async ({ mode }) => ({
      status: "available" as const,
      rows: [row],
      loadedCount: 1,
      totalCount: 1,
      ...(mode === "detailed" ? {} : {}),
    }));
    render(<SearchControllerHarness action={action} scope={defaultScope} />);

    fireEvent.change(screen.getByRole("textbox", { name: "Query" }), {
      target: { value: "billing" },
    });
    await waitFor(
      () => expect(action).toHaveBeenCalledWith({ mode: "quick", query: "billing" }),
      { timeout: 1_500 },
    );
    expect(screen.getByTestId("quick")).toHaveTextContent("42");

    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    await waitFor(() => expect(screen.getByTestId("detailed")).toHaveTextContent("42"));
    expect(action).toHaveBeenCalledWith({ mode: "detailed", query: "billing" });

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(screen.getByTestId("detailed")).toHaveTextContent("inactive");
  });

  it("clears query and result state when the personal connection scope changes", async () => {
    const action = vi.fn<SearchWorkspaceTicketsAction>(async () => ({
      status: "available" as const,
      rows: [row],
      loadedCount: 1,
      totalCount: 1,
    }));
    const firstScope = defaultScope;
    const secondScope = {
      ...firstScope,
      workspaceId: "workspace-2",
      helpdeskConnectionId: "connection-2",
    };
    const view = render(
      <SearchControllerHarness action={action} scope={firstScope} />,
    );

    fireEvent.change(screen.getByRole("textbox", { name: "Query" }), {
      target: { value: "billing" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    await waitFor(() =>
      expect(screen.getByTestId("detailed")).toHaveTextContent("42"),
    );

    view.rerender(
      <SearchControllerHarness action={action} scope={secondScope} />,
    );
    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: "Query" })).toHaveValue(""),
    );
    expect(screen.getByTestId("quick")).toHaveTextContent("");
    expect(screen.getByTestId("detailed")).toHaveTextContent("inactive");
  });
});
