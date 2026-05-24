import type { HelpdeskProviderPlugin } from "@/core/providers";
import type { ProviderRegistry } from "@/providers";
import type { HelpdeskConnectionMessageCode } from "./messages";

export type ParsedConnectionForm = {
  displayName: string;
  providerKey: string;
  baseUrl: string;
  credentialScheme: string;
  credentialPayload?: Record<string, string>;
};

export function textValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function pluginFor(registry: ProviderRegistry, providerKey: string) {
  return registry.get(providerKey) ?? null;
}

function schemeFor(plugin: HelpdeskProviderPlugin, schemeKey: string) {
  return plugin.credentialSchemes.find((scheme) => scheme.key === schemeKey) ?? null;
}

function credentialsFromForm(
  formData: FormData,
  plugin: HelpdeskProviderPlugin,
  credentialScheme: string,
  mode: "create" | "update",
): Record<string, string> | undefined {
  const scheme = schemeFor(plugin, credentialScheme);
  if (!scheme) {
    return undefined;
  }

  const payload: Record<string, string> = {};
  let filledCount = 0;

  for (const field of scheme.fields) {
    const value = textValue(formData, field.name);
    if (value) {
      filledCount += 1;
      payload[field.name] = value;
    }
  }

  if (mode === "update" && filledCount === 0) {
    return undefined;
  }

  if (filledCount !== scheme.fields.length) {
    return {};
  }

  return payload;
}

export function parseConnectionForm(
  formData: FormData,
  registry: ProviderRegistry,
  mode: "create" | "update",
): ParsedConnectionForm | HelpdeskConnectionMessageCode {
  const displayName = textValue(formData, "displayName");
  const providerKey = textValue(formData, "providerKey");
  const baseUrl = textValue(formData, "baseUrl");
  const credentialScheme = textValue(formData, "credentialScheme");

  if (!displayName || !providerKey || !baseUrl || !credentialScheme) {
    return "invalid-input";
  }

  const plugin = pluginFor(registry, providerKey);
  if (!plugin) {
    return "unknown-provider";
  }

  if (!schemeFor(plugin, credentialScheme)) {
    return "unknown-credential-scheme";
  }

  const credentialPayload = credentialsFromForm(
    formData,
    plugin,
    credentialScheme,
    mode,
  );

  if (credentialPayload && Object.keys(credentialPayload).length === 0) {
    return "credential-required";
  }

  return {
    displayName,
    providerKey,
    baseUrl,
    credentialScheme,
    credentialPayload,
  };
}
