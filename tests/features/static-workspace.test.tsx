import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { StaticWorkspace } from "@/features/workspace";

function renderWorkspace() {
  render(<StaticWorkspace userEmail="agent@example.com" />);
}

describe("StaticWorkspace", () => {
  it("changes saved view selection with the searchable selector", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByRole("combobox", { name: "Saved view" }));
    await user.type(screen.getByPlaceholderText("Find view"), "owned");
    await user.click(screen.getByRole("option", { name: "Owned by me" }));

    expect(screen.getByRole("combobox", { name: "Saved view" })).toHaveTextContent(
      "Owned by me",
    );
  });

  it("switches ticket tab orientation without persistence", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByRole("combobox", { name: "Tab orientation" }));
    await user.click(screen.getByRole("option", { name: "Vertical tabs" }));

    expect(screen.getByLabelText("Open tickets")).toHaveClass("flex-col");
  });

  it("keeps tabs visible and changes active ticket locally", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    const tab = screen.getByRole("tab", { name: /#48288/i });
    await user.click(tab);

    expect(tab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByLabelText("Open tickets")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: /Webhook delivery failed overnight/i,
      }),
    );
    expect(
      screen.getByRole("row", { name: /Webhook delivery failed overnight/i }),
    ).toHaveAttribute("aria-selected", "true");
  });

  it("supports local row selection and column visibility", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByRole("checkbox", { name: "Select all" }));
    expect(screen.getByText("7 / 7")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Column visibility" }));
    await user.click(screen.getByRole("menuitem", { name: "Customer" }));

    expect(screen.queryByText("Maya Patel")).not.toBeInTheDocument();
    expect(screen.getByText("7 / 7")).toBeInTheDocument();
  });

  it("changes visual workspace selection through the compact profile menu", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByRole("button", { name: /open profile menu/i }));
    const menu = screen.getByRole("menu");
    await user.click(within(menu).getByRole("menuitem", { name: "Contoso Care" }));

    expect(
      screen.getByRole("button", { name: /open profile menu, contoso care/i }),
    ).toBeInTheDocument();
  });

  it("renders the agreed table columns and omits the state review control", () => {
    renderWorkspace();

    expect(screen.getByRole("columnheader", { name: "#" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Title" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Customer" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Owner" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "State" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Priority" })).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Pending till" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Updated at" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "State preview" })).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Workspace" })).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "SLA" })).not.toBeInTheDocument();
  });
});
