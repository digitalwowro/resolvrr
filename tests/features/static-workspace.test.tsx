import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { StaticWorkspace } from "@/features/workspace";

function renderWorkspace() {
  render(<StaticWorkspace userEmail="agent@example.com" />);
}

describe("StaticWorkspace", () => {
  it("changes saved view selection locally", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByRole("combobox", { name: "Saved view" }));
    await user.click(screen.getByRole("option", { name: "Assigned to me" }));

    expect(screen.getByRole("combobox", { name: "Saved view" })).toHaveTextContent(
      "Assigned to me",
    );
  });

  it("switches ticket tab orientation without persistence", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByRole("combobox", { name: "Tab orientation" }));
    await user.click(screen.getByRole("option", { name: "Vertical tabs" }));

    expect(screen.getByLabelText("Open tickets")).toHaveClass("flex-col");
  });

  it("updates active ticket from tabs and table rows", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByRole("tab", { name: /#48288 login loop/i }));
    expect(
      screen.getByRole("heading", { name: /#48288 login loop/i }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: /#48277 webhook delivery failed overnight/i,
      }),
    );
    expect(
      screen.getByRole("heading", { name: /#48277 webhook delivery/i }),
    ).toBeInTheDocument();
  });

  it("supports local row selection and column visibility", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByRole("checkbox", { name: "Select all tickets" }));
    expect(screen.getByText("7 of 7 selected")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Column visibility" }));
    await user.click(screen.getByRole("menuitem", { name: "Requester" }));

    expect(
      within(screen.getByRole("table")).queryByText("Maya Patel"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("7 of 7 selected")).toBeInTheDocument();
  });

  it("changes visual workspace selection through the profile menu", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByRole("button", { name: /open profile menu/i }));
    const menu = screen.getByRole("menu");
    await user.click(within(menu).getByRole("menuitem", { name: "Contoso Care" }));

    expect(screen.getAllByText("Contoso Care").length).toBeGreaterThan(0);
  });

  it("renders static loading, empty, error, and disconnected variants", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByRole("combobox", { name: "State preview" }));
    await user.click(screen.getByRole("option", { name: "Loading" }));
    expect(screen.getByRole("status", { name: "Loading tickets" })).toBeInTheDocument();

    await user.click(screen.getByRole("combobox", { name: "State preview" }));
    await user.click(screen.getByRole("option", { name: "Empty" }));
    expect(screen.getByText("No tickets in this view")).toBeInTheDocument();

    await user.click(screen.getByRole("combobox", { name: "State preview" }));
    await user.click(screen.getByRole("option", { name: "Error" }));
    expect(screen.getByText("Ticket list unavailable")).toBeInTheDocument();

    await user.click(screen.getByRole("combobox", { name: "State preview" }));
    await user.click(screen.getByRole("option", { name: "Disconnected" }));
    expect(screen.getByText("No workspace connected")).toBeInTheDocument();
  });
});
