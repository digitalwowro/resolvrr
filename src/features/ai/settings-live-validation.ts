import type { WorkspaceAiSettingsActionCode } from "./settings-model";
import type { AiRuntimeConfig } from "./provider-config";
import { generateAiText } from "./text-generation";

export async function validateAiProviderConfig(
  config: Extract<AiRuntimeConfig, { status: "available" }>,
): Promise<WorkspaceAiSettingsActionCode | null> {
  const result = await generateAiText(config, {
    maxOutputTokens: 8,
    systemInstruction: "Validate this AI provider configuration.",
    userPrompt: "Reply with the single word OK.",
  });
  if (result.status === "available") {
    return null;
  }

  return result.reason;
}
