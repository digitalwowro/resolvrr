import type { HelpdeskProviderPlugin } from "@/core/providers";

export type ProviderRegistry = {
  list(): HelpdeskProviderPlugin[];
  get(providerKey: string): HelpdeskProviderPlugin | undefined;
  require(providerKey: string): HelpdeskProviderPlugin;
};

// Composition code supplies plugins; provider-neutral code reads only this contract.
export function createProviderRegistry(
  plugins: HelpdeskProviderPlugin[],
): ProviderRegistry {
  const byKey = new Map<string, HelpdeskProviderPlugin>();

  for (const plugin of plugins) {
    if (byKey.has(plugin.key)) {
      throw new Error(`Duplicate helpdesk provider plugin: ${plugin.key}`);
    }
    byKey.set(plugin.key, plugin);
  }

  return {
    list: () => [...byKey.values()],
    get: (providerKey) => byKey.get(providerKey),
    require: (providerKey) => {
      const plugin = byKey.get(providerKey);
      if (!plugin) {
        throw new Error(`Unknown helpdesk provider plugin: ${providerKey}`);
      }
      return plugin;
    },
  };
}
