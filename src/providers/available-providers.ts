import { createProviderRegistry } from "./registry";
import { zammadProviderPlugin } from "./zammad";

// This is the only source file allowed to import installed provider plugins directly.
// Core, feature, UI, and data modules must consume the provider-neutral registry export.
export const providerRegistry = createProviderRegistry([zammadProviderPlugin]);
