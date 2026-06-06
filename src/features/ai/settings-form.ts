import { validateProviderBaseUrl } from "@/security/base-url-validation";
import type {
  AiProviderProtocol,
  WorkspaceAiPolicy,
  WorkspaceAiSettingsActionCode,
} from "./settings-model";

export type ParsedAiSettingsConfigInput = {
  apiKey: string;
  baseUrl: string;
  model: string;
  providerProtocol: AiProviderProtocol;
};

const providerProtocols = new Set<string>([
  "anthropic-compatible",
  "openai-compatible",
]);

const workspacePolicies = new Set<string>([
  "admin-managed",
  "disabled",
  "user-provided",
]);

function textValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export function policyFromForm(
  formData: FormData,
): WorkspaceAiPolicy | WorkspaceAiSettingsActionCode {
  const value = textValue(formData, "policy");
  return workspacePolicies.has(value)
    ? (value as WorkspaceAiPolicy)
    : "invalid-ai-input";
}

export async function configInputFromForm(
  formData: FormData,
): Promise<ParsedAiSettingsConfigInput | WorkspaceAiSettingsActionCode> {
  const providerProtocol = textValue(formData, "providerProtocol");
  const baseUrl = textValue(formData, "baseUrl");
  const model = textValue(formData, "model");
  const apiKey = textValue(formData, "apiKey");

  if (!providerProtocols.has(providerProtocol) || !baseUrl || !model) {
    return "missing-ai-config";
  }

  try {
    const validated = await validateProviderBaseUrl(baseUrl);
    return {
      apiKey,
      baseUrl: validated.canonicalUrl,
      model,
      providerProtocol: providerProtocol as AiProviderProtocol,
    };
  } catch {
    return "invalid-ai-base-url";
  }
}
