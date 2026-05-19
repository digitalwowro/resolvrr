import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Button, Checkbox, LoadingState, Spinner, StatusBadge } from "@/components/ui";

describe("basic UI primitives", () => {
  it("disables compact buttons while loading", () => {
    render(<Button loading>Save</Button>);

    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });

  it("renders checkbox labels, help text, and errors", () => {
    render(
      <Checkbox
        error="Required"
        helpText="Used for compact lists"
        label="Visible"
        name="visible"
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("checkbox", { name: /visible/i })).toBeInTheDocument();
    expect(screen.getByText("Used for compact lists")).toBeInTheDocument();
    expect(screen.getByText("Required")).toBeInTheDocument();
  });

  it("renders loading and status states", () => {
    render(
      <>
        <Spinner label="Refreshing" />
        <LoadingState label="Loading rows" />
        <StatusBadge label="Open" tone="info" />
      </>,
    );

    expect(screen.getByRole("status", { name: "Refreshing" })).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Loading rows" })).toBeInTheDocument();
    expect(screen.getByText("Open")).toBeInTheDocument();
  });
});
