// Defines AI prompt operations and their editability before UI/runtime use.
export const ticketSummaryPromptKey = "ticket-summary";
export const ticketSummaryPromptVersion = "ticket-summary-prompt-v2";
export const draftProofreadPromptKey = "draft-proofread";
export const draftProofreadPromptVersion = "draft-proofread-prompt-v1";
export const draftRephrasePromptKey = "draft-rephrase";
export const draftRephrasePromptVersion = "draft-rephrase-prompt-v1";

const supplementalSummaryGuidanceEditor = {
  contract: {
    description:
      "Resolvrr owns and validates this structure. Workspace guidance cannot override it.",
    requirements: [
      "Situation is always required.",
      "Timeline is optional, chronological, and limited to significant events.",
      "Next Risk is included only when supported by the ticket.",
      "Content is factual, sanitized, and limited to 140 words.",
    ],
    title: "Output contract",
  },
  fieldLabel: "Summary guidance",
  helperText:
    "Adjust what summaries emphasize and how they are worded. The fixed structure, factuality, and safety rules remain unchanged.",
  kind: "supplemental-guidance",
  resetLabel: "Reset guidance",
  saveLabel: "Save guidance",
  statusLabels: {
    builtIn: "Default guidance",
    customized: "Custom guidance",
  },
} as const;

const completePromptEditor = {
  contract: null,
  fieldLabel: "Prompt",
  helperText:
    "This workspace prompt controls the selected AI operation, including its guardrail instructions. Changes apply to all users in this workspace.",
  kind: "complete-prompt",
  resetLabel: "Reset prompt",
  saveLabel: "Save prompt",
  statusLabels: {
    builtIn: "Default",
    customized: "Custom",
  },
} as const;

export const ticketSummaryDefaultPrompt = [
  "You summarize helpdesk tickets for internal support agents.",
  "Prioritize the current situation, significant chronology, and any unresolved risk supported by the ticket.",
  "Prefer concise operational language that helps an agent understand the ticket quickly.",
].join(" ");

export const draftProofreadDefaultPrompt = [
  "You proofread support-agent draft text.",
  "Fix grammar, spelling, punctuation, clarity, and awkward phrasing.",
  "Preserve the original meaning and do not add facts, commitments, promises, identifiers, or customer-visible claims.",
  "Apply the user's My Style lightly only when it does not conflict with accuracy or preservation of meaning.",
  "Return only the improved draft text as plain text.",
].join(" ");

export const draftRephraseDefaultPrompt = [
  "You rephrase support-agent draft text.",
  "Follow the selected workspace rephrase style while preserving the original meaning.",
  "Do not add facts, commitments, promises, identifiers, or customer-visible claims.",
  "Apply the user's workspace-specific My Style when it fits the selected style and does not conflict with accuracy.",
  "Return only the rewritten draft text as plain text.",
].join(" ");

const aiPromptDefinitions = [
  {
    adminEditable: true,
    defaultPrompt: ticketSummaryDefaultPrompt,
    description: "Supplemental guidance for internal selected-ticket summaries.",
    editor: supplementalSummaryGuidanceEditor,
    key: ticketSummaryPromptKey,
    label: "Ticket summary",
    maxLength: 2_000,
    version: ticketSummaryPromptVersion,
  },
  {
    adminEditable: true,
    defaultPrompt: draftProofreadDefaultPrompt,
    description: "Proofread user-written note and reply drafts.",
    editor: completePromptEditor,
    key: draftProofreadPromptKey,
    label: "Draft proofread",
    maxLength: 2_000,
    version: draftProofreadPromptVersion,
  },
  {
    adminEditable: true,
    defaultPrompt: draftRephraseDefaultPrompt,
    description: "Rephrase user-written note and reply drafts.",
    editor: completePromptEditor,
    key: draftRephrasePromptKey,
    label: "Draft rephrase",
    maxLength: 2_000,
    version: draftRephrasePromptVersion,
  },
] as const;

export type AiPromptDefinition = (typeof aiPromptDefinitions)[number];
export type AiPromptKey = AiPromptDefinition["key"];
export type AiPromptEditorKind = AiPromptDefinition["editor"]["kind"];

export function listAiPromptDefinitions(): AiPromptDefinition[] {
  return [...aiPromptDefinitions];
}

export function findAiPromptDefinition(
  key: string,
): AiPromptDefinition | null {
  return aiPromptDefinitions.find((definition) => definition.key === key) ?? null;
}
