import { decryptSecret, encryptSecret } from "@/security/encryption";
import type { AuthUser } from "@/auth/types";
import type { HelpdeskConnectionsRepository } from "@/features/helpdesk-connections/repository";
import {
  builtInRephraseStylePrompt,
  builtInRephraseStyles,
} from "./rephrase-style-defaults";
import type {
  AiRephraseStyleRepository,
  StoredWorkspaceAiRephraseStyle,
} from "./rephrase-style-repository";
import {
  activeWorkspace,
  type ActiveWorkspace,
} from "./settings-service";
import type {
  AiRephraseStylesData,
  EffectiveAiRephraseStyle,
  UserAiRephraseStyleOverrideView,
  WorkspaceAiRephraseStyleView,
} from "./rephrase-style-model";

export const aiRephraseStyleKeyVersion = "v1";
export const maxAiRephraseStyleLabelLength = 80;
export const maxAiRephraseStylePromptLength = 2_000;

function decryptPrompt(value: string | null, encryptionKey: string) {
  if (!value) {
    return null;
  }
  try {
    return decryptSecret(value, encryptionKey);
  } catch {
    return null;
  }
}

function stylePrompt(
  style: StoredWorkspaceAiRephraseStyle,
  encryptionKey: string,
) {
  return (
    decryptPrompt(style.encryptedPrompt, encryptionKey) ??
    builtInRephraseStylePrompt(style.seedKey) ??
    ""
  );
}

function enabledStyles(styles: StoredWorkspaceAiRephraseStyle[]) {
  return styles.filter((style) => style.isEnabled);
}

export async function loadAiRephraseStyles(input: {
  connectionRepository: HelpdeskConnectionsRepository;
  styleRepository: AiRephraseStyleRepository;
  userId: string;
}): Promise<AiRephraseStylesData> {
  const workspace = await activeWorkspace(input.connectionRepository, input.userId);
  if (!workspace) {
    return { activeWorkspace: null, styles: [] };
  }
  const styles = enabledStyles(
    await input.styleRepository.listWorkspaceStyles(workspace.id),
  ).map((style) => ({
    id: style.id,
    label: style.label,
  }));
  return { activeWorkspace: workspace, styles };
}

export async function workspaceStyleViews(input: {
  encryptionKey: string;
  styleRepository: AiRephraseStyleRepository;
  workspace: ActiveWorkspace;
}): Promise<WorkspaceAiRephraseStyleView[]> {
  const styles = await input.styleRepository.listWorkspaceStyles(
    input.workspace.id,
  );
  return styles.map((style) => ({
    id: style.id,
    isBuiltIn: Boolean(style.seedKey),
    isCustomized: Boolean(style.encryptedPrompt),
    isEnabled: style.isEnabled,
    label: style.label,
    maxLength: maxAiRephraseStylePromptLength,
    prompt: stylePrompt(style, input.encryptionKey),
    sortOrder: style.sortOrder,
  }));
}

export async function userStyleOverrideViews(input: {
  encryptionKey: string;
  styleRepository: AiRephraseStyleRepository;
  userId: string;
  workspace: ActiveWorkspace;
}): Promise<UserAiRephraseStyleOverrideView[]> {
  if (!input.workspace.access.canEditAiRephraseStyleOverrides) {
    return [];
  }
  const [styles, overrides] = await Promise.all([
    input.styleRepository.listWorkspaceStyles(input.workspace.id),
    input.styleRepository.listUserStyleOverrides({
      workspaceId: input.workspace.id,
      userId: input.userId,
    }),
  ]);
  const overrideByStyle = new Map(
    overrides.map((override) => [override.styleId, override]),
  );
  return enabledStyles(styles).map((style) => {
    const override = overrideByStyle.get(style.id);
    const userPrompt = decryptPrompt(
      override?.encryptedPrompt ?? null,
      input.encryptionKey,
    );
    const defaultPrompt = stylePrompt(style, input.encryptionKey);
    return {
      defaultPrompt,
      id: style.id,
      isCustomized: Boolean(userPrompt),
      label: style.label,
      maxLength: maxAiRephraseStylePromptLength,
      prompt: userPrompt ?? defaultPrompt,
    };
  });
}

export async function resolveEffectiveAiRephraseStyle(input: {
  encryptionKey: string;
  workspaceId: string;
  styleId: string | undefined;
  styleRepository: AiRephraseStyleRepository;
  userId: string;
  workspaceAccess: ActiveWorkspace["access"];
}): Promise<EffectiveAiRephraseStyle | null> {
  if (!input.styleId) {
    return null;
  }
  const style = await input.styleRepository.getWorkspaceStyle({
    workspaceId: input.workspaceId,
    styleId: input.styleId,
  });
  if (!style?.isEnabled) {
    return null;
  }

  const overridePrompt = input.workspaceAccess.canEditAiRephraseStyleOverrides
    ? decryptPrompt(
        (
          await input.styleRepository.getUserStyleOverride({
            workspaceId: input.workspaceId,
            styleId: style.id,
            userId: input.userId,
          })
        )?.encryptedPrompt ?? null,
        input.encryptionKey,
      )
    : null;
  return {
    id: style.id,
    label: style.label,
    prompt: overridePrompt ?? stylePrompt(style, input.encryptionKey),
    source: overridePrompt ? "user" : "workspace",
  };
}

export function canManageWorkspaceAi(user: AuthUser, workspace: ActiveWorkspace) {
  return user.role === "ADMIN" || workspace.access.role === "ADMIN";
}

export function normalizedStyleLabel(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizedStylePrompt(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export function validStyleLabel(label: string) {
  return label.length > 0 && label.length <= maxAiRephraseStyleLabelLength;
}

export function validStylePrompt(prompt: string) {
  return prompt.length > 0 && prompt.length <= maxAiRephraseStylePromptLength;
}

export function encryptedStylePrompt(prompt: string, encryptionKey: string) {
  return encryptSecret(prompt, encryptionKey);
}

export function defaultStyleRows() {
  return builtInRephraseStyles;
}
