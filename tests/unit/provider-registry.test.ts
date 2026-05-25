import { describe, expect, it } from "vitest";
import {
  ProviderError,
  type HelpdeskProviderPlugin,
} from "@/core/providers";
import { createProviderRegistry } from "@/providers";

const plugin: HelpdeskProviderPlugin = {
  key: "example",
  label: "Example",
  capabilities: [],
  credentialSchemes: [],
  validateConnection: async () => undefined,
  listTickets: async () => ({
    tickets: [],
    loadedCount: 0,
    measuredAt: new Date("2026-01-01T00:00:00.000Z"),
  }),
  getTicketDetail: async () => {
    throw new ProviderError("unsupported-capability", "Not implemented");
  },
  updateTicketMetadata: async () => {
    throw new ProviderError("unsupported-capability", "Not implemented");
  },
};

describe("provider registry", () => {
  it("lists and resolves registered provider plugins by key", () => {
    const registry = createProviderRegistry([plugin]);

    expect(registry.list()).toHaveLength(1);
    expect(registry.get("example")).toBe(plugin);
    expect(registry.require("example")).toBe(plugin);
  });

  it("rejects duplicate provider keys", () => {
    expect(() => createProviderRegistry([plugin, plugin])).toThrow(
      "Duplicate helpdesk provider plugin",
    );
  });
});
