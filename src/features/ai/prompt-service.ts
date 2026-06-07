import type { AuthUser } from "@/auth/types";
import { decryptSecret } from "@/security/encryption";
import type { HelpdeskConnectionsRepository } from "@/features/helpdesk-connections/repository";
import type { AiPromptRepository, StoredAiPrompt } from "./prompt-repository";
import {
  findAiPromptDefinition,
  hasUserOverridablePrompts,
  listAiPromptDefinitions,
  type AiPromptDefinition,
  type AiPromptKey,
} from "./prompt-registry";
import type { AiSettingsRepository } from "./settings-repository";
import {
  activeWorkspace,
  settingsDataForWorkspace,
  type ActiveWorkspace,
} from "./settings-service";
import type {
  AiPromptAdminView,
  AiPromptCenterData,
  AiPromptUserView,
} from "./prompt-model";

export type EffectiveAiPrompt = {
  key: AiPromptKey;
  prompt: string;
  source: "built-in" | "user" | "workspace";
  version: string;
};

function promptMap(records: StoredAiPrompt[]) {
  return new Map(records.map((record) => [record.promptKey, record]));
}

function decryptPrompt(record: StoredAiPrompt | null, encryptionKey: string) {
  if (!record) {
    return null;
  }

  try {
    return decryptSecret(record.encryptedPrompt, encryptionKey);
  } catch {
    return null;
  }
}

function workspacePromptText(
  definition: AiPromptDefinition,
  records: Map<string, StoredAiPrompt>,
  encryptionKey: string,
) {
  return decryptPrompt(records.get(definition.key) ?? null, encryptionKey);
}

function adminView(
  definition: AiPromptDefinition,
  records: Map<string, StoredAiPrompt>,
  encryptionKey: string,
): AiPromptAdminView {
  const prompt = workspacePromptText(definition, records, encryptionKey);
  return {
    builtInPrompt: definition.defaultPrompt,
    description: definition.description,
    isCustomized: Boolean(prompt),
    key: definition.key,
    label: definition.label,
    maxLength: definition.maxLength,
    prompt: prompt ?? definition.defaultPrompt,
    userOverridable: definition.userOverridable,
  };
}

function userView(input: {
  definition: AiPromptDefinition;
  encryptionKey: string;
  userRecords: Map<string, StoredAiPrompt>;
  workspaceRecords: Map<string, StoredAiPrompt>;
}): AiPromptUserView {
  const defaultPrompt =
    workspacePromptText(
      input.definition,
      input.workspaceRecords,
      input.encryptionKey,
    ) ?? input.definition.defaultPrompt;
  const userPrompt = decryptPrompt(
    input.userRecords.get(input.definition.key) ?? null,
    input.encryptionKey,
  );
  return {
    defaultPrompt,
    description: input.definition.description,
    isCustomized: Boolean(userPrompt),
    key: input.definition.key,
    label: input.definition.label,
    maxLength: input.definition.maxLength,
    prompt: userPrompt ?? defaultPrompt,
  };
}

function emptyPromptCenterData(input: {
  user: AuthUser;
  workspace: ActiveWorkspace | null;
}): AiPromptCenterData {
  return {
    activeWorkspace: input.workspace,
    adminPrompts: [],
    allowUserPromptOverrides: false,
    canManageWorkspace: input.user.role === "ADMIN",
    canView: false,
    policy: "disabled",
    userPrompts: [],
  };
}

export async function promptCenterDataForWorkspace(input: {
  encryptionKey: string;
  promptRepository: AiPromptRepository;
  settingsRepository: AiSettingsRepository;
  user: AuthUser;
  workspace: ActiveWorkspace | null;
}): Promise<AiPromptCenterData> {
  if (!input.workspace) {
    return emptyPromptCenterData({
      user: input.user,
      workspace: input.workspace,
    });
  }

  const settings = await settingsDataForWorkspace(
    input.settingsRepository,
    input.user,
    input.workspace,
  );
  if (settings.policy === "disabled") {
    return {
      ...emptyPromptCenterData({ user: input.user, workspace: input.workspace }),
      allowUserPromptOverrides: settings.allowUserPromptOverrides,
    };
  }

  const canManageWorkspace = input.user.role === "ADMIN";
  const workspaceRecords = promptMap(
    await input.promptRepository.listWorkspacePrompts(input.workspace.id),
  );
  const userRecords = promptMap(
    await input.promptRepository.listUserPromptOverrides({
      helpdeskConnectionId: input.workspace.id,
      userId: input.user.id,
    }),
  );
  const definitions = listAiPromptDefinitions();
  const adminPrompts = canManageWorkspace
    ? definitions
        .filter((definition) => definition.adminEditable)
        .map((definition) =>
          adminView(definition, workspaceRecords, input.encryptionKey),
        )
    : [];
  const userPrompts =
    settings.allowUserPromptOverrides
      ? definitions
          .filter((definition) => definition.userOverridable)
          .map((definition) =>
            userView({
              definition,
              encryptionKey: input.encryptionKey,
              userRecords,
              workspaceRecords,
            }),
          )
      : [];

  return {
    activeWorkspace: input.workspace,
    adminPrompts,
    allowUserPromptOverrides: settings.allowUserPromptOverrides,
    canManageWorkspace,
    canView: canManageWorkspace || userPrompts.length > 0,
    policy: settings.policy,
    userPrompts,
  };
}

export async function loadAiPromptCenter(input: {
  connectionRepository: HelpdeskConnectionsRepository;
  encryptionKey: string;
  promptRepository: AiPromptRepository;
  settingsRepository: AiSettingsRepository;
  user: AuthUser;
}): Promise<AiPromptCenterData> {
  return promptCenterDataForWorkspace({
    encryptionKey: input.encryptionKey,
    promptRepository: input.promptRepository,
    settingsRepository: input.settingsRepository,
    user: input.user,
    workspace: await activeWorkspace(input.connectionRepository, input.user.id),
  });
}

export async function resolveEffectiveAiPrompt(input: {
  encryptionKey: string;
  helpdeskConnectionId: string;
  promptKey: AiPromptKey;
  promptRepository: AiPromptRepository;
  settingsRepository: AiSettingsRepository;
  userId: string;
}): Promise<EffectiveAiPrompt> {
  const definition = findAiPromptDefinition(input.promptKey);
  if (!definition) {
    throw new Error("Unknown AI prompt key");
  }

  const [workspaceSetting, workspacePrompt] = await Promise.all([
    input.settingsRepository.getWorkspaceSetting(input.helpdeskConnectionId),
    input.promptRepository.getWorkspacePrompt({
      helpdeskConnectionId: input.helpdeskConnectionId,
      promptKey: input.promptKey,
    }),
  ]);
  const workspaceText = decryptPrompt(workspacePrompt, input.encryptionKey);
  const adminPrompt = workspaceText ?? definition.defaultPrompt;

  if (!workspaceSetting?.allowUserPromptOverrides || !definition.userOverridable) {
    return {
      key: definition.key,
      prompt: adminPrompt,
      source: workspaceText ? "workspace" : "built-in",
      version: definition.version,
    };
  }

  const userPrompt = await input.promptRepository.getUserPromptOverride({
    helpdeskConnectionId: input.helpdeskConnectionId,
    promptKey: input.promptKey,
    userId: input.userId,
  });
  const userText = decryptPrompt(userPrompt, input.encryptionKey);
  return {
    key: definition.key,
    prompt: userText ?? adminPrompt,
    source: userText ? "user" : workspaceText ? "workspace" : "built-in",
    version: definition.version,
  };
}

export function promptCenterVisibleFromSettings(input: {
  allowUserPromptOverrides: boolean;
  canManageWorkspace: boolean;
  policy: string;
}): boolean {
  if (input.policy === "disabled") {
    return false;
  }
  return input.canManageWorkspace ||
    (input.allowUserPromptOverrides && hasUserOverridablePrompts());
}
