import {
  AiProviderProtocol as DbAiProviderProtocol,
  WorkspaceAiPolicy as DbWorkspaceAiPolicy,
} from "@/generated/prisma/enums";
import { prisma } from "@/data/prisma";
import type {
  AiSettingsRepository,
  StoredAiProviderConfig,
  UpsertWorkspaceAiSettingInput,
} from "@/features/ai/settings-repository";
import type {
  AiProviderProtocol,
  WorkspaceAiPolicy,
} from "@/features/ai/settings-model";

function toDbPolicy(policy: WorkspaceAiPolicy): DbWorkspaceAiPolicy {
  if (policy === "admin-managed") {
    return DbWorkspaceAiPolicy.ADMIN_MANAGED;
  }
  if (policy === "user-provided") {
    return DbWorkspaceAiPolicy.USER_PROVIDED;
  }
  return DbWorkspaceAiPolicy.DISABLED;
}

function toPolicy(policy: DbWorkspaceAiPolicy): WorkspaceAiPolicy {
  if (policy === DbWorkspaceAiPolicy.ADMIN_MANAGED) {
    return "admin-managed";
  }
  if (policy === DbWorkspaceAiPolicy.USER_PROVIDED) {
    return "user-provided";
  }
  return "disabled";
}

function toDbProtocol(protocol: AiProviderProtocol): DbAiProviderProtocol {
  return protocol === "anthropic-compatible"
    ? DbAiProviderProtocol.ANTHROPIC_COMPATIBLE
    : DbAiProviderProtocol.OPENAI_COMPATIBLE;
}

function toProtocol(protocol: DbAiProviderProtocol): AiProviderProtocol {
  return protocol === DbAiProviderProtocol.ANTHROPIC_COMPATIBLE
    ? "anthropic-compatible"
    : "openai-compatible";
}

function configFromRecord(record: {
  baseUrl: string | null;
  encryptedApiKey: string | null;
  keyVersion: string;
  modelName: string | null;
  providerProtocol: DbAiProviderProtocol | null;
}): StoredAiProviderConfig | null {
  if (
    !record.baseUrl ||
    !record.encryptedApiKey ||
    !record.modelName ||
    !record.providerProtocol
  ) {
    return null;
  }

  return {
    baseUrl: record.baseUrl,
    encryptedApiKey: record.encryptedApiKey,
    keyVersion: record.keyVersion,
    model: record.modelName,
    providerProtocol: toProtocol(record.providerProtocol),
  };
}

function userPermissionsFromRecord(record: {
  usersCanEditAiRephraseStyleOverrides: boolean;
  usersCanEditMyStyle: boolean;
}) {
  return {
    canEditAiRephraseStyleOverrides:
      record.usersCanEditAiRephraseStyleOverrides,
    canEditMyStyle: record.usersCanEditMyStyle,
  };
}

function configData(input: Pick<UpsertWorkspaceAiSettingInput, "config">) {
  return input.config
    ? {
        baseUrl: input.config.baseUrl,
        encryptedApiKey: input.config.encryptedApiKey,
        keyVersion: input.config.keyVersion,
        modelName: input.config.model,
        providerProtocol: toDbProtocol(input.config.providerProtocol),
      }
    : {
        baseUrl: null,
        encryptedApiKey: null,
        modelName: null,
        providerProtocol: null,
      };
}

function userPermissionsData(
  input: Pick<UpsertWorkspaceAiSettingInput, "userPermissions">,
) {
  return {
    usersCanEditAiRephraseStyleOverrides:
      input.userPermissions.canEditAiRephraseStyleOverrides,
    usersCanEditMyStyle: input.userPermissions.canEditMyStyle,
  };
}

export const prismaAiSettingsRepository: AiSettingsRepository = {
  async deleteUserSettingsForWorkspace(helpdeskConnectionId) {
    await prisma.userWorkspaceAiSetting.deleteMany({
      where: { helpdeskConnectionId },
    });
  },

  async getUserSetting(userId, helpdeskConnectionId) {
    const setting = await prisma.userWorkspaceAiSetting.findUnique({
      where: {
        userId_helpdeskConnectionId: {
          helpdeskConnectionId,
          userId,
        },
      },
    });
    if (!setting) {
      return null;
    }

    return {
      baseUrl: setting.baseUrl,
      encryptedApiKey: setting.encryptedApiKey,
      keyVersion: setting.keyVersion,
      model: setting.modelName,
      providerProtocol: toProtocol(setting.providerProtocol),
    };
  },

  async getWorkspaceSetting(helpdeskConnectionId) {
    const setting = await prisma.workspaceAiSetting.findUnique({
      where: { helpdeskConnectionId },
    });
    if (!setting) {
      return null;
    }

    return {
      config: configFromRecord(setting),
      helpdeskConnectionId,
      policy: toPolicy(setting.policy),
      userPermissions: userPermissionsFromRecord(setting),
    };
  },

  async upsertUserSetting(input) {
    await prisma.userWorkspaceAiSetting.upsert({
      where: {
        userId_helpdeskConnectionId: {
          helpdeskConnectionId: input.helpdeskConnectionId,
          userId: input.userId,
        },
      },
      create: {
        baseUrl: input.baseUrl,
        encryptedApiKey: input.encryptedApiKey,
        helpdeskConnectionId: input.helpdeskConnectionId,
        keyVersion: input.keyVersion,
        modelName: input.model,
        providerProtocol: toDbProtocol(input.providerProtocol),
        userId: input.userId,
      },
      update: {
        baseUrl: input.baseUrl,
        encryptedApiKey: input.encryptedApiKey,
        keyVersion: input.keyVersion,
        modelName: input.model,
        providerProtocol: toDbProtocol(input.providerProtocol),
      },
    });
  },

  async upsertWorkspaceSetting(input) {
    await prisma.workspaceAiSetting.upsert({
      where: { helpdeskConnectionId: input.helpdeskConnectionId },
      create: {
        ...configData(input),
        helpdeskConnectionId: input.helpdeskConnectionId,
        policy: toDbPolicy(input.policy),
        ...userPermissionsData(input),
      },
      update: {
        ...configData(input),
        policy: toDbPolicy(input.policy),
        ...userPermissionsData(input),
      },
    });
  },
};
