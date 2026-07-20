import { afterEach, describe, expect, it, vi } from "vitest";
import { zammadProviderPlugin } from "@/providers/zammad";
import { safeProviderJson } from "@/security/provider-http";
import { providerContext } from "./read-helpers";

vi.mock("@/security/provider-http", () => ({
  safeProviderJson: vi.fn(),
  ProviderJsonBodyError: class ProviderJsonBodyError extends Error {},
}));

const mockedSafeProviderJson = vi.mocked(safeProviderJson);

describe("Zammad ticket list page size", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("caps direct provider list pages at 100 rows", async () => {
    mockedSafeProviderJson.mockResolvedValue({
      status: 200,
      headers: new Headers(),
      data: [],
    });

    await zammadProviderPlugin.listTickets?.(providerContext(), {
      filter: {},
      pageSize: 500,
    });

    expect(mockedSafeProviderJson).toHaveBeenCalledWith(
      "https://helpdesk.example.com/api/v1/tickets/search?page=1&per_page=100&full=true&query=NOT+%28state.name%3A%22merged%22%29",
      expect.any(Object),
    );
  });
});
