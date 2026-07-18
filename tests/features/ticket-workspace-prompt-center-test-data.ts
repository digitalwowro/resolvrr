import type {
  AiPromptCenterData,
  WorkspaceAiRephraseStyleView,
} from "@/features/ai";

export const promptCenterActiveWorkspace = {
  access: {
    canEditAiRephraseStyleOverrides: true,
    canEditMyStyle: true,
    role: "ADMIN" as const,
  },
  id: "connection-1",
  label: "Support",
};

const summaryGuidanceEditor = {
  contract: {
    description: "Resolvrr owns and validates this structure.",
    requirements: [
      "Situation is always required.",
      "Timeline is optional.",
      "Next Risk is optional.",
    ],
    title: "Output contract",
  },
  fieldLabel: "Summary guidance",
  helperText: "Adjust emphasis and wording without changing the fixed contract.",
  kind: "supplemental-guidance" as const,
  resetLabel: "Reset guidance",
  saveLabel: "Save guidance",
  statusLabels: {
    builtIn: "Default guidance",
    customized: "Custom guidance",
  },
};

const defaultStyles: WorkspaceAiRephraseStyleView[] = [
  {
    id: "style-concise",
    isBuiltIn: true,
    isCustomized: false,
    isEnabled: true,
    label: "Concise",
    maxLength: 2_000,
    prompt: "Make the reply concise.",
    sortOrder: 10,
  },
  {
    id: "style-friendly",
    isBuiltIn: true,
    isCustomized: false,
    isEnabled: true,
    label: "Friendly",
    maxLength: 2_000,
    prompt: "Make the reply friendly.",
    sortOrder: 20,
  },
];

export function promptCenterData({
  prompt = "Built-in summary guidance.",
  isCustomized = false,
  styles = defaultStyles,
}: {
  prompt?: string;
  isCustomized?: boolean;
  styles?: WorkspaceAiRephraseStyleView[];
} = {}): AiPromptCenterData {
  return {
    activeWorkspace: promptCenterActiveWorkspace,
    adminPrompts: [
      {
        builtInPrompt: "Built-in summary guidance.",
        description: "Additional guidance for selected-ticket summaries.",
        editor: summaryGuidanceEditor,
        isCustomized,
        key: "ticket-summary",
        label: "Ticket summary",
        maxLength: 2_000,
        prompt,
      },
    ],
    canManageWorkspace: true,
    canView: true,
    policy: "admin-managed",
    userRephraseStyleOverrides: [],
    workspaceRephraseStyles: styles,
  };
}
