import { afterEach, describe, expect, it, vi } from "vitest";
import { zammadProviderPlugin } from "@/providers/zammad";
import { safeProviderJson } from "@/security/provider-http";
import { providerContext } from "./read-helpers";

vi.mock("@/security/provider-http", () => ({
  safeProviderJson: vi.fn(),
  ProviderJsonBodyError: class ProviderJsonBodyError extends Error {
    reason: string;

    constructor(reason: string, message: string) {
      super(message);
      this.name = "ProviderJsonBodyError";
      this.reason = reason;
    }
  },
}));

const mockedSafeProviderJson = vi.mocked(safeProviderJson);

describe("Zammad lookup reads", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("lists active assignable users with group access", async () => {
    mockedSafeProviderJson.mockResolvedValueOnce({
      status: 200,
      headers: new Headers(),
      data: [
        {
          id: 3,
          firstname: "Agent",
          lastname: "Smith",
          email: "agent@example.com",
          active: true,
          group_ids: { "1": ["full"] },
        },
        {
          id: 4,
          firstname: "Customer",
          lastname: "Only",
          active: true,
          group_ids: {},
        },
        {
          id: 5,
          fullname: "Inactive Agent",
          active: false,
          group_ids: { "1": ["full"] },
        },
      ],
    });

    await expect(
      zammadProviderPlugin.listAssignableUsers?.(providerContext()),
    ).resolves.toEqual([{ externalId: "3", label: "Agent Smith" }]);
    expect(mockedSafeProviderJson).toHaveBeenCalledWith(
      "https://helpdesk.example.com/api/v1/users?page=1&per_page=50",
      expect.objectContaining({
        allowedAddresses: ["93.184.216.34"],
        headers: expect.objectContaining({
          Accept: "application/json",
          Authorization: "Basic YWdlbnQ6c2VjcmV0",
          "User-Agent": "Resolvrr/1.0",
        }),
      }),
    );
  });

  it("lists active groups as provider-neutral lookup options", async () => {
    mockedSafeProviderJson.mockResolvedValueOnce({
      status: 200,
      headers: new Headers(),
      data: [
        { id: 1, name: "Support", active: true },
        { id: 2, name: "Retired", active: false },
      ],
    });

    await expect(
      zammadProviderPlugin.listGroups?.(providerContext()),
    ).resolves.toEqual([{ externalId: "1", label: "Support" }]);
    expect(mockedSafeProviderJson).toHaveBeenCalledWith(
      "https://helpdesk.example.com/api/v1/groups?page=1&per_page=50",
      expect.objectContaining({
        allowedAddresses: ["93.184.216.34"],
      }),
    );
  });

  it("lists global tags as provider-neutral lookup options", async () => {
    mockedSafeProviderJson.mockResolvedValueOnce({
      status: 200,
      headers: new Headers(),
      data: [
        { id: 1, name: "high-priority" },
        { id: 2, name: "channel-operations" },
        { id: 3, name: "" },
      ],
    });

    await expect(zammadProviderPlugin.listTags?.(providerContext())).resolves
      .toEqual([
        { externalId: "1", label: "high-priority" },
        { externalId: "2", label: "channel-operations" },
      ]);
    expect(mockedSafeProviderJson).toHaveBeenCalledWith(
      "https://helpdesk.example.com/api/v1/tag_list",
      expect.objectContaining({
        allowedAddresses: ["93.184.216.34"],
      }),
    );
  });
});
