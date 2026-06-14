import type { ActiveWorkspace } from "./settings-service";
import type { WorkspaceAiPolicy } from "./settings-model";
import type { AiPromptKey } from "./prompt-registry";
import type {
  UserAiRephraseStyleOverrideView,
  WorkspaceAiRephraseStyleView,
} from "./rephrase-style-model";

export type AiPromptAdminView = {
  builtInPrompt: string;
  description: string;
  isCustomized: boolean;
  key: AiPromptKey;
  label: string;
  maxLength: number;
  prompt: string;
};

export type AiPromptCenterData = {
  activeWorkspace: ActiveWorkspace | null;
  adminPrompts: AiPromptAdminView[];
  canManageWorkspace: boolean;
  canView: boolean;
  policy: WorkspaceAiPolicy;
  userRephraseStyleOverrides: UserAiRephraseStyleOverrideView[];
  workspaceRephraseStyles: WorkspaceAiRephraseStyleView[];
};

export type AiPromptActionCode =
  | "ai-disabled"
  | "ai-prompt-reset"
  | "ai-prompt-saved"
  | "ai-rephrase-style-created"
  | "ai-rephrase-style-deleted"
  | "ai-rephrase-style-moved"
  | "ai-rephrase-style-override-reset"
  | "ai-rephrase-style-override-saved"
  | "ai-rephrase-style-saved"
  | "invalid-ai-prompt"
  | "invalid-ai-prompt-input"
  | "invalid-ai-rephrase-style"
  | "no-active-workspace"
  | "not-admin"
  | "style-not-user-editable";

export type AiPromptActionResult = {
  code: AiPromptActionCode;
  data: AiPromptCenterData;
  ok: boolean;
};

export type LoadAiPromptCenterAction = () => Promise<AiPromptCenterData>;
export type SaveWorkspaceAiPromptAction =
  (formData: FormData) => Promise<AiPromptActionResult>;
export type ResetWorkspaceAiPromptAction =
  (promptKey: AiPromptKey) => Promise<AiPromptActionResult>;
export type SaveWorkspaceAiRephraseStyleAction =
  (formData: FormData) => Promise<AiPromptActionResult>;
export type DeleteWorkspaceAiRephraseStyleAction =
  (styleId: string) => Promise<AiPromptActionResult>;
export type MoveWorkspaceAiRephraseStyleAction =
  (styleId: string, direction: "down" | "up") => Promise<AiPromptActionResult>;
export type SaveUserAiRephraseStyleOverrideAction =
  (formData: FormData) => Promise<AiPromptActionResult>;
export type ResetUserAiRephraseStyleOverrideAction =
  (styleId: string) => Promise<AiPromptActionResult>;
