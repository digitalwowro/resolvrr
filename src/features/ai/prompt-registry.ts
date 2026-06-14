// Defines AI prompt operations and their editability before UI/runtime use.
export const ticketSummaryPromptKey = "ticket-summary";
export const ticketSummaryPromptVersion = "ticket-summary-prompt-v1";
export const draftProofreadPromptKey = "draft-proofread";
export const draftProofreadPromptVersion = "draft-proofread-prompt-v1";
export const draftRephrasePromptKey = "draft-rephrase";
export const draftRephrasePromptVersion = "draft-rephrase-prompt-v1";

export const ticketSummaryDefaultPrompt = [
  "You summarize helpdesk tickets for internal support agents.",
  "Use only the provided ticket data.",
  "Do not invent facts, next actions, identifiers, or customer commitments.",
  "Do not write a customer reply.",
  "Return plain text under 140 words with three short sections: Situation, Timeline, Next Risk.",
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
  "Follow the requested rephrase mode while preserving the original meaning.",
  "Do not add facts, commitments, promises, identifiers, or customer-visible claims.",
  "Apply the user's My Style when it fits the requested mode and does not conflict with accuracy.",
  "Return only the rewritten draft text as plain text.",
].join(" ");

const aiPromptDefinitions = [
  {
    adminEditable: true,
    defaultPrompt: ticketSummaryDefaultPrompt,
    description: "Internal selected-ticket summary instructions.",
    key: ticketSummaryPromptKey,
    label: "Ticket summary",
    maxLength: 2_000,
    userOverridable: false,
    version: ticketSummaryPromptVersion,
  },
  {
    adminEditable: true,
    defaultPrompt: draftProofreadDefaultPrompt,
    description: "Proofread user-written note and reply drafts.",
    key: draftProofreadPromptKey,
    label: "Draft proofread",
    maxLength: 2_000,
    userOverridable: true,
    version: draftProofreadPromptVersion,
  },
  {
    adminEditable: true,
    defaultPrompt: draftRephraseDefaultPrompt,
    description: "Rephrase user-written note and reply drafts.",
    key: draftRephrasePromptKey,
    label: "Draft rephrase",
    maxLength: 2_000,
    userOverridable: true,
    version: draftRephrasePromptVersion,
  },
] as const;

export type AiPromptDefinition = (typeof aiPromptDefinitions)[number];
export type AiPromptKey = AiPromptDefinition["key"];

export function listAiPromptDefinitions(): AiPromptDefinition[] {
  return [...aiPromptDefinitions];
}

export function findAiPromptDefinition(
  key: string,
): AiPromptDefinition | null {
  return aiPromptDefinitions.find((definition) => definition.key === key) ?? null;
}

export function hasUserOverridablePrompts(): boolean {
  return aiPromptDefinitions.some((definition) => definition.userOverridable);
}
