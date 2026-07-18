import type { AuthUser } from "@/auth/types";
import { decryptSecret } from "@/security/encryption";
import type { HelpdeskConnectionsRepository } from "@/features/helpdesk-connections/repository";
import type { AiPromptRepository, StoredAiPrompt } from "./prompt-repository";
import {
  findAiPromptDefinition,
  listAiPromptDefinitions,
  type AiPromptDefinition,
  type AiPromptKey,
} from "./prompt-registry";
import type { AiRephraseStyleRepository } from "./rephrase-style-repository";
import {
  canManageWorkspaceAi,
  userStyleOverrideViews,
  workspaceStyleViews,
} from "./rephrase-style-service";
import type { AiSettingsRepository } from "./settings-repository";
import {
  activeWorkspace,
  settingsDataForWorkspace,
  type ActiveWorkspace,
} from "./settings-service";
import type {
  AiPromptAdminView,
  AiPromptCenterData,
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
    editor: {
      contract: definition.editor.contract
        ? {
            description: definition.editor.contract.description,
            requirements: [...definition.editor.contract.requirements],
            title: definition.editor.contract.title,
          }
        : null,
      fieldLabel: definition.editor.fieldLabel,
      helperText: definition.editor.helperText,
      kind: definition.editor.kind,
      resetLabel: definition.editor.resetLabel,
      saveLabel: definition.editor.saveLabel,
      statusLabels: { ...definition.editor.statusLabels },
    },
    isCustomized: Boolean(prompt),
    key: definition.key,
    label: definition.label,
    maxLength: definition.maxLength,
    prompt: prompt ?? definition.defaultPrompt,
  };
}

function emptyPromptCenterData(input: {
  user: AuthUser;
  workspace: ActiveWorkspace | null;
}): AiPromptCenterData {
  return {
    activeWorkspace: input.workspace,
    adminPrompts: [],
    canManageWorkspace: input.user.role === "ADMIN",
    canView: false,
    policy: "disabled",
    userRephraseStyleOverrides: [],
    workspaceRephraseStyles: [],
  };
}

export async function promptCenterDataForWorkspace(input: {
  encryptionKey: string;
  promptRepository: AiPromptRepository;
  rephraseStyleRepository: AiRephraseStyleRepository;
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
    };
  }

  const canManageWorkspace = canManageWorkspaceAi(input.user, input.workspace);
  const workspaceRecords = promptMap(
    await input.promptRepository.listWorkspacePrompts(input.workspace.id),
  );
  const definitions = listAiPromptDefinitions();
  const adminPrompts = canManageWorkspace
    ? definitions
        .filter((definition) => definition.adminEditable)
        .map((definition) =>
          adminView(definition, workspaceRecords, input.encryptionKey),
        )
    : [];
  const workspaceRephraseStyles = canManageWorkspace
    ? await workspaceStyleViews({
        encryptionKey: input.encryptionKey,
        styleRepository: input.rephraseStyleRepository,
        workspace: input.workspace,
      })
    : [];
  const userRephraseStyleOverrides = await userStyleOverrideViews({
    encryptionKey: input.encryptionKey,
    styleRepository: input.rephraseStyleRepository,
    userId: input.user.id,
    workspace: input.workspace,
  });

  return {
    activeWorkspace: input.workspace,
    adminPrompts,
    canManageWorkspace,
    canView: canManageWorkspace || userRephraseStyleOverrides.length > 0,
    policy: settings.policy,
    userRephraseStyleOverrides,
    workspaceRephraseStyles,
  };
}

export async function loadAiPromptCenter(input: {
  connectionRepository: HelpdeskConnectionsRepository;
  encryptionKey: string;
  promptRepository: AiPromptRepository;
  rephraseStyleRepository: AiRephraseStyleRepository;
  settingsRepository: AiSettingsRepository;
  user: AuthUser;
}): Promise<AiPromptCenterData> {
  return promptCenterDataForWorkspace({
    encryptionKey: input.encryptionKey,
    promptRepository: input.promptRepository,
    rephraseStyleRepository: input.rephraseStyleRepository,
    settingsRepository: input.settingsRepository,
    user: input.user,
    workspace: await activeWorkspace(input.connectionRepository, input.user.id),
  });
}

export async function resolveEffectiveAiPrompt(input: {
  encryptionKey: string;
  workspaceId: string;
  promptKey: AiPromptKey;
  promptRepository: AiPromptRepository;
  settingsRepository: AiSettingsRepository;
  userId: string;
}): Promise<EffectiveAiPrompt> {
  const definition = findAiPromptDefinition(input.promptKey);
  if (!definition) {
    throw new Error("Unknown AI prompt key");
  }

  const workspacePrompt = await input.promptRepository.getWorkspacePrompt({
    workspaceId: input.workspaceId,
    promptKey: input.promptKey,
  });
  const workspaceText = decryptPrompt(workspacePrompt, input.encryptionKey);
  const adminPrompt = workspaceText ?? definition.defaultPrompt;
  return {
    key: definition.key,
    prompt: adminPrompt,
    source: workspaceText ? "workspace" : "built-in",
    version: definition.version,
  };
}

export function promptCenterVisibleFromSettings(input: {
  canManageWorkspace: boolean;
  canEditAiRephraseStyleOverrides: boolean;
  policy: string;
}): boolean {
  if (input.policy === "disabled") {
    return false;
  }
  return input.canManageWorkspace || input.canEditAiRephraseStyleOverrides;
}
