import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TicketWorkspaceContent } from "@/features/workspace/components/ticket-workspace-content";

describe("ticket workspace content spacing", () => {
  it("keeps padding on the horizontal main content container", () => {
    render(
      <TicketWorkspaceContent
        listActive
        tabOrientation="horizontal"
        tabsPanel={<div>Tabs</div>}
        workArea={<div data-testid="work-area">Work area</div>}
      />,
    );

    expect(screen.getByTestId("work-area").parentElement).toHaveClass("px-4");
  });

  it("leaves the vertical main content container unpadded", () => {
    render(
      <TicketWorkspaceContent
        listActive
        tabOrientation="vertical"
        tabsPanel={<div>Tabs</div>}
        workArea={<div data-testid="work-area">Work area</div>}
      />,
    );

    expect(screen.getByTestId("work-area").parentElement).not.toHaveClass(
      "px-4",
    );
  });
});
