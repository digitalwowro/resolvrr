import { afterEach, describe, expect, it, vi } from "vitest";
import { zammadProviderPlugin } from "@/providers/zammad";
import { safeProviderJson } from "@/security/provider-http";
import { providerContext, rawTicket } from "./read-helpers";

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

describe("Zammad ticket secondary metadata mutations", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("writes tags, related links, and subscription through Zammad secondary endpoints", async () => {
    mockedSafeProviderJson
      .mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        data: { tags: ["old", "vip"] },
      })
      .mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        data: {},
      })
      .mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        data: {},
      })
      .mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        data: rawTicket,
      })
      .mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        data: {},
      })
      .mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        data: {},
      })
      .mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        data: { id: 4, email: "agent@example.com" },
      })
      .mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        data: { mentions: [] },
      })
      .mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        data: {},
      });

    await zammadProviderPlugin.updateTicketMetadata?.(providerContext(), "42", {
      linkAddExternalId: "77",
      linkAddRelation: "related",
      linkRemoveExternalIds: ["88"],
      subscriptionFollowing: true,
      tags: ["vip", "renewal"],
    });

    expect(mockedSafeProviderJson).toHaveBeenNthCalledWith(
      1,
      "https://helpdesk.example.com/api/v1/tags?object=Ticket&o_id=42",
      expect.any(Object),
    );
    expect(mockedSafeProviderJson).toHaveBeenNthCalledWith(
      2,
      "https://helpdesk.example.com/api/v1/tags/remove",
      expect.objectContaining({
        body: JSON.stringify({
          item: "old",
          object: "Ticket",
          o_id: 42,
        }),
        method: "DELETE",
      }),
    );
    expect(mockedSafeProviderJson).toHaveBeenNthCalledWith(
      3,
      "https://helpdesk.example.com/api/v1/tags/add",
      expect.objectContaining({
        body: JSON.stringify({
          item: "renewal",
          object: "Ticket",
          o_id: 42,
        }),
        method: "POST",
      }),
    );
    expect(mockedSafeProviderJson).toHaveBeenNthCalledWith(
      4,
      "https://helpdesk.example.com/api/v1/tickets/42?expand=true&full=true",
      expect.any(Object),
    );
    expect(mockedSafeProviderJson).toHaveBeenNthCalledWith(
      5,
      "https://helpdesk.example.com/api/v1/links/remove",
      expect.objectContaining({
        body: JSON.stringify({
          link_type: "normal",
          link_object_source: "Ticket",
          link_object_source_value: 42042,
          link_object_target: "Ticket",
          link_object_target_value: 88,
        }),
        method: "DELETE",
      }),
    );
    expect(mockedSafeProviderJson).toHaveBeenNthCalledWith(
      6,
      "https://helpdesk.example.com/api/v1/links/add",
      expect.objectContaining({
        body: JSON.stringify({
          link_type: "normal",
          link_object_target: "Ticket",
          link_object_target_value: 77,
          link_object_source: "Ticket",
          link_object_source_number: "42042",
        }),
        method: "POST",
      }),
    );
    expect(mockedSafeProviderJson).toHaveBeenNthCalledWith(
      7,
      "https://helpdesk.example.com/api/v1/users/me",
      expect.any(Object),
    );
    expect(mockedSafeProviderJson).toHaveBeenNthCalledWith(
      8,
      "https://helpdesk.example.com/api/v1/mentions?mentionable_type=Ticket&mentionable_id=42",
      expect.any(Object),
    );
    expect(mockedSafeProviderJson).toHaveBeenNthCalledWith(
      9,
      "https://helpdesk.example.com/api/v1/mentions",
      expect.objectContaining({
        body: JSON.stringify({
          mentionable_type: "Ticket",
          mentionable_id: 42,
        }),
        method: "POST",
      }),
    );
  });

  it("maps provider-neutral parent and child relation writes to Zammad link types", async () => {
    mockedSafeProviderJson
      .mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        data: rawTicket,
      })
      .mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        data: {},
      })
      .mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        data: rawTicket,
      })
      .mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        data: {},
      });

    await zammadProviderPlugin.updateTicketMetadata?.(providerContext(), "42", {
      linkAddExternalId: "77",
      linkAddRelation: "parent",
    });
    await zammadProviderPlugin.updateTicketMetadata?.(providerContext(), "42", {
      linkAddExternalId: "78",
      linkAddRelation: "child",
    });

    expect(mockedSafeProviderJson).toHaveBeenNthCalledWith(
      2,
      "https://helpdesk.example.com/api/v1/links/add",
      expect.objectContaining({
        body: JSON.stringify({
          link_type: "child",
          link_object_target: "Ticket",
          link_object_target_value: 77,
          link_object_source: "Ticket",
          link_object_source_number: "42042",
        }),
        method: "POST",
      }),
    );
    expect(mockedSafeProviderJson).toHaveBeenNthCalledWith(
      4,
      "https://helpdesk.example.com/api/v1/links/add",
      expect.objectContaining({
        body: JSON.stringify({
          link_type: "parent",
          link_object_target: "Ticket",
          link_object_target_value: 78,
          link_object_source: "Ticket",
          link_object_source_number: "42042",
        }),
        method: "POST",
      }),
    );
  });

});
