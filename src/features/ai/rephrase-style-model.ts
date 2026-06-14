import type { ActiveWorkspace } from "./settings-service";

export type AiRephraseStyleOption = {
  id: string;
  label: string;
};

export type WorkspaceAiRephraseStyleView = {
  id: string;
  isBuiltIn: boolean;
  isCustomized: boolean;
  isEnabled: boolean;
  label: string;
  maxLength: number;
  prompt: string;
  sortOrder: number;
};

export type UserAiRephraseStyleOverrideView = {
  defaultPrompt: string;
  id: string;
  isCustomized: boolean;
  label: string;
  maxLength: number;
  prompt: string;
};

export type AiRephraseStylesData = {
  activeWorkspace: ActiveWorkspace | null;
  styles: AiRephraseStyleOption[];
};

export type LoadAiRephraseStylesAction = () => Promise<AiRephraseStylesData>;

export type EffectiveAiRephraseStyle = {
  id: string;
  label: string;
  prompt: string;
  source: "user" | "workspace";
};
