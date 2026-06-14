import { decryptSecret, encryptSecret } from "@/security/encryption";
import type { MyStyleRepository } from "./my-style-repository";
import {
  emptyMyStyle,
  type MyStyleActionResult,
  type MyStyleData,
  type MyStyleDataResult,
} from "./my-style-model";

const myStyleKeyVersion = "v1";
const maxShortFieldLength = 160;
const maxLongFieldLength = 1_000;

function textValue(formData: FormData, key: keyof MyStyleData): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function normalizedStyle(formData: FormData): MyStyleData {
  return {
    audience: textValue(formData, "audience"),
    constraints: textValue(formData, "constraints"),
    preferences: textValue(formData, "preferences"),
    role: textValue(formData, "role"),
    tone: textValue(formData, "tone"),
  };
}

function validStyle(style: MyStyleData): boolean {
  return (
    style.role.length <= maxShortFieldLength &&
    style.audience.length <= maxShortFieldLength &&
    style.tone.length <= maxShortFieldLength &&
    style.preferences.length <= maxLongFieldLength &&
    style.constraints.length <= maxLongFieldLength
  );
}

function parseStoredStyle(value: string): MyStyleData {
  const parsed = JSON.parse(value) as Partial<MyStyleData>;
  return {
    audience: typeof parsed.audience === "string" ? parsed.audience : "",
    constraints: typeof parsed.constraints === "string" ? parsed.constraints : "",
    preferences:
      typeof parsed.preferences === "string" ? parsed.preferences : "",
    role: typeof parsed.role === "string" ? parsed.role : "",
    tone: typeof parsed.tone === "string" ? parsed.tone : "",
  };
}

export async function loadMyStyle(input: {
  encryptionKey: string;
  helpdeskConnectionId: string | undefined;
  canEdit?: boolean;
  activeWorkspaceLabel?: string | null;
  repository: MyStyleRepository;
  userId: string | undefined;
}): Promise<MyStyleDataResult> {
  const dataContext = {
    activeWorkspace: input.helpdeskConnectionId
      ? {
          id: input.helpdeskConnectionId,
          label: input.activeWorkspaceLabel ?? "Active workspace",
        }
      : null,
    canEdit: input.canEdit ?? false,
  };
  if (!input.userId || !input.helpdeskConnectionId) {
    return { ...dataContext, style: emptyMyStyle };
  }

  const record = await input.repository.getMyStyle(
    input.userId,
    input.helpdeskConnectionId,
  );
  if (!record) {
    return { ...dataContext, style: emptyMyStyle };
  }

  try {
    return {
      ...dataContext,
      style: parseStoredStyle(
        decryptSecret(record.encryptedStyle, input.encryptionKey),
      ),
    };
  } catch {
    return { ...dataContext, style: emptyMyStyle };
  }
}

export async function saveMyStyle(input: {
  activeWorkspaceLabel?: string | null;
  canEdit?: boolean;
  encryptionKey: string;
  formData: FormData;
  helpdeskConnectionId: string | undefined;
  repository: MyStyleRepository;
  userId: string | undefined;
}): Promise<MyStyleActionResult> {
  const data = await loadMyStyle(input);
  if (!input.userId) {
    return { code: "not-authenticated", data, ok: false };
  }
  if (!input.helpdeskConnectionId) {
    return { code: "no-active-workspace", data, ok: false };
  }
  if (!input.canEdit) {
    return { code: "my-style-not-editable", data, ok: false };
  }

  const style = normalizedStyle(input.formData);
  if (!validStyle(style)) {
    return { code: "invalid-my-style", data, ok: false };
  }

  await input.repository.upsertMyStyle({
    encryptedStyle: encryptSecret(JSON.stringify(style), input.encryptionKey),
    helpdeskConnectionId: input.helpdeskConnectionId,
    keyVersion: myStyleKeyVersion,
    userId: input.userId,
  });

  return {
    code: "my-style-saved",
    data: { ...data, style },
    ok: true,
  };
}

export async function resetMyStyle(input: {
  activeWorkspaceLabel?: string | null;
  canEdit?: boolean;
  encryptionKey: string;
  helpdeskConnectionId: string | undefined;
  repository: MyStyleRepository;
  userId: string | undefined;
}): Promise<MyStyleActionResult> {
  const data = await loadMyStyle(input);
  if (!input.userId) {
    return { code: "not-authenticated", data, ok: false };
  }
  if (!input.helpdeskConnectionId) {
    return { code: "no-active-workspace", data, ok: false };
  }
  if (!input.canEdit) {
    return { code: "my-style-not-editable", data, ok: false };
  }

  await input.repository.deleteMyStyle(input.userId, input.helpdeskConnectionId);
  return {
    code: "my-style-reset",
    data: { ...data, style: emptyMyStyle },
    ok: true,
  };
}
