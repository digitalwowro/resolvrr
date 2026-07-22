import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TicketMetadataMutationBanner } from
  "@/features/workspace/components/ticket-metadata-mutation-banner";

describe("ticket update failure banner", () => {
  it("prominently announces a failed update", () => {
    render(
      <TicketMetadataMutationBanner
        result={{
          status: "failed",
          field: "communication",
          message: "The conversation history could not be included.",
        }}
      />,
    );

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Update failed");
    expect(alert).toHaveTextContent(
      "The conversation history could not be included.",
    );
    expect(alert).toHaveClass("bg-rose-50");
  });

  it("does not render successful or idle states", () => {
    const { rerender } = render(
      <TicketMetadataMutationBanner result={{ status: "idle" }} />,
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    rerender(
      <TicketMetadataMutationBanner
        result={{ status: "saved", field: "communication", message: "Saved." }}
      />,
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
