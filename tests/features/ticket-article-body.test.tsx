import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { TicketArticleBody } from "@/features/workspace/components/ticket-article-body";

describe("TicketArticleBody", () => {
  it("hides collapsed signature content until expanded", async () => {
    const user = userEvent.setup();

    render(
      <TicketArticleBody
        html={`
          <p>Hi Nicole,</p>
          <p>We are looking into this.</p>
          <p>Razvan Rosca</p>
          <p>--</p>
          <p>Super Support - Waterford Business Park<br>5201 Blue Lagoon Drive<br>Email: hot@example.com - Web: http://www.example.com/</p>
        `}
      />,
    );

    expect(screen.getByText("We are looking into this.")).toBeInTheDocument();
    expect(screen.queryByText(/Super Support/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Show signature" }));

    expect(screen.getByText(/Super Support/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Hide signature" }),
    ).toBeInTheDocument();
  });
});
