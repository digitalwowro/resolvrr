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
          id: 5,
          fullname: "Inactive Agent",
          active: false,
          group_ids: { "1": ["full"] },
        },
      ],
    });

    await expect(
      zammadProviderPlugin.listAssignableUsers?.(
        providerContext(),
        { groupExternalIds: ["1"] },
      ),
    ).resolves.toEqual([{ externalId: "3", label: "Agent Smith" }]);
    expect(mockedSafeProviderJson).toHaveBeenCalledWith(
      "https://helpdesk.example.com/api/v1/users/search?page=1&per_page=200&permissions=ticket.agent&query=*&group_ids%5B1%5D=full",
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

  it("keeps server-qualified owners when Zammad masks group membership fields", async () => {
    mockedSafeProviderJson.mockResolvedValueOnce({
      status: 200,
      headers: new Headers(),
      data: [
        {
          id: 4,
          firstname: "Manuela",
          lastname: "Duma",
          active: true,
        },
      ],
    });

    await expect(
      zammadProviderPlugin.listAssignableUsers?.(
        providerContext(),
        { groupExternalIds: ["7"] },
      ),
    ).resolves.toEqual([{ externalId: "4", label: "Manuela Duma" }]);
    expect(mockedSafeProviderJson).toHaveBeenCalledWith(
      expect.stringContaining("group_ids%5B7%5D=full"),
      expect.any(Object),
    );
  });

  it("uses Zammad's group-scoped agent mention suggestions", async () => {
    mockedSafeProviderJson.mockResolvedValueOnce({
      status: 200,
      headers: new Headers(),
      data: {
        data: {
          mentionSuggestions: [
            {
              internalId: 4,
              fullname: "Manuela Duma",
              email: "manuela@example.com",
              active: true,
            },
            {
              internalId: 5,
              fullname: "Inactive Agent",
              active: false,
            },
            {
              internalId: 6,
              fullname: "Dan Pollak",
              email: "manager@example.com",
              active: true,
            },
            {
              internalId: 7,
              fullname: "Yathursan Ethirmannasingham",
              active: true,
            },
          ],
        },
      },
    });

    await expect(
      zammadProviderPlugin.listMentionableUsers?.(providerContext(), {
        groupExternalId: "7",
        query: "Man",
      }),
    ).resolves.toEqual([
      { externalId: "4", label: "Manuela Duma" },
      { externalId: "7", label: "Yathursan Ethirmannasingham" },
    ]);
    expect(mockedSafeProviderJson).toHaveBeenCalledWith(
      "https://helpdesk.example.com/graphql",
      expect.objectContaining({
        body: expect.stringContaining(
          '"groupId":"gid://zammad/Group/7","query":"Man"',
        ),
        method: "POST",
      }),
    );
  });

  it("paginates group-aware agent searches beyond Zammad's page limit", async () => {
    mockedSafeProviderJson
      .mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        data: Array.from({ length: 200 }, (_value, index) => ({
          id: index + 2,
          fullname: `Agent ${index + 1}`,
          active: true,
          group_ids: { "7": ["full"] },
        })),
      })
      .mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        data: [{ id: 202, fullname: "Agent 201", active: true, group_ids: { "7": ["full"] } }],
      });

    const result = await zammadProviderPlugin.listAssignableUsers?.(
      providerContext(),
      { groupExternalIds: ["7"] },
    );

    expect(result).toHaveLength(201);
    expect(mockedSafeProviderJson).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("page=2&per_page=200"),
      expect.any(Object),
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
      "https://helpdesk.example.com/api/v1/groups?page=1&per_page=200",
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

  it("resolves the current Zammad user as a provider-neutral lookup option", async () => {
    mockedSafeProviderJson.mockResolvedValueOnce({
      status: 200,
      headers: new Headers(),
      data: {
        id: 9,
        firstname: "Za",
        lastname: "Mad",
        email: "agent@example.com",
        active: true,
      },
    });

    await expect(zammadProviderPlugin.getCurrentUser?.(providerContext())).resolves
      .toEqual({ externalId: "9", label: "Za Mad" });
    expect(mockedSafeProviderJson).toHaveBeenCalledWith(
      "https://helpdesk.example.com/api/v1/users/me",
      expect.objectContaining({
        allowedAddresses: ["93.184.216.34"],
      }),
    );
  });
});
