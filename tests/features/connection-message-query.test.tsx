import { render, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ClearConnectionMessageQuery } from "@/features/helpdesk-connections/components/clear-connection-message-query";

describe("ClearConnectionMessageQuery", () => {
  it("removes transient connection message params after render", async () => {
    window.history.pushState(
      {},
      "",
      "/workspace/connections/new?error=provider-temporary-failure&tab=details",
    );

    render(<ClearConnectionMessageQuery />);

    await waitFor(() => {
      expect(window.location.pathname).toBe("/workspace/connections/new");
      expect(window.location.search).toBe("?tab=details");
    });
  });

  it("removes success params without leaving an empty query string", async () => {
    window.history.pushState(
      {},
      "",
      "/workspace/connections?success=validated",
    );

    render(<ClearConnectionMessageQuery />);

    await waitFor(() => {
      expect(window.location.pathname).toBe("/workspace/connections");
      expect(window.location.search).toBe("");
    });
  });
});
