import type { ActiveWorkspace } from "./settings-service";
import type { WorkspaceAiPolicy } from "./settings-model";
import type { AiPromptKey } from "./prompt-registry";

export type AiPromptAdminView = {
  builtInPrompt: string;
  description: string;
  isCustomized: boolean;
  key: AiPromptKey;
  label: string;
  maxLength: number;
  prompt: string;
  userOverridable: boolean;
};

export type AiPromptUserView = {
  defaultPrompt: string;
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
  allowUserPromptOverrides: boolean;
  canManageWorkspace: boolean;
  canView: boolean;
  policy: WorkspaceAiPolicy;
  userPrompts: AiPromptUserView[];
};

export type AiPromptActionCode =
  | "ai-disabled"
  | "ai-prompt-policy-saved"
  | "ai-prompt-reset"
  | "ai-prompt-saved"
  | "ai-user-prompt-reset"
  | "ai-user-prompt-saved"
  | "invalid-ai-prompt"
  | "invalid-ai-prompt-input"
  | "no-active-workspace"
  | "not-admin"
  | "prompt-not-user-editable";

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
export type SaveUserAiPromptOverrideAction =
  (formData: FormData) => Promise<AiPromptActionResult>;
export type ResetUserAiPromptOverrideAction =
  (promptKey: AiPromptKey) => Promise<AiPromptActionResult>;
export type SaveAiPromptOverridePolicyAction =
  (formData: FormData) => Promise<AiPromptActionResult>;
