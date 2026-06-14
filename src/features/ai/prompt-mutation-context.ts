import type { AuthUser } from "@/auth/types";
import type { HelpdeskConnectionsRepository } from "@/features/helpdesk-connections/repository";
import type {
  AiPromptActionCode,
  AiPromptActionResult,
} from "./prompt-model";
import type { AiPromptRepository } from "./prompt-repository";
import { promptCenterDataForWorkspace } from "./prompt-service";
import type { AiRephraseStyleRepository } from "./rephrase-style-repository";
import type { AiSettingsRepository } from "./settings-repository";
import { activeWorkspace } from "./settings-service";
import type { AiSummaryCacheRepository } from "./summary-cache-repository";

export type PromptMutationInput = {
  aiSummaryCacheRepository: AiSummaryCacheRepository;
  connectionRepository: HelpdeskConnectionsRepository;
  direction?: "down" | "up";
  encryptionKey: string;
  formData?: FormData;
  promptKey?: string;
  promptRepository: AiPromptRepository;
  rephraseStyleRepository: AiRephraseStyleRepository;
  settingsRepository: AiSettingsRepository;
  styleId?: string;
  user: AuthUser;
};

export function actionResult(
  code: AiPromptActionCode,
  data: Awaited<ReturnType<typeof promptCenterDataForWorkspace>>,
  ok: boolean,
): AiPromptActionResult {
  return { code, data, ok };
}

export async function mutationContext(input: PromptMutationInput) {
  const workspace = await activeWorkspace(
    input.connectionRepository,
    input.user.id,
  );
  const data = await promptCenterDataForWorkspace({
    encryptionKey: input.encryptionKey,
    promptRepository: input.promptRepository,
    rephraseStyleRepository: input.rephraseStyleRepository,
    settingsRepository: input.settingsRepository,
    user: input.user,
    workspace,
  });
  return { data, workspace };
}

export async function refreshedData(
  input: PromptMutationInput,
  workspace: NonNullable<Awaited<ReturnType<typeof activeWorkspace>>>,
) {
  return promptCenterDataForWorkspace({
    encryptionKey: input.encryptionKey,
    promptRepository: input.promptRepository,
    rephraseStyleRepository: input.rephraseStyleRepository,
    settingsRepository: input.settingsRepository,
    user: input.user,
    workspace,
  });
}
