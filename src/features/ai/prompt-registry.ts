// Defines AI prompt operations and their editability before UI/runtime use.
export const ticketSummaryPromptKey = "ticket-summary";
export const ticketSummaryPromptVersion = "ticket-summary-prompt-v1";

export const ticketSummaryDefaultPrompt = [
  "You summarize helpdesk tickets for internal support agents.",
  "Use only the provided ticket data.",
  "Do not invent facts, next actions, identifiers, or customer commitments.",
  "Do not write a customer reply.",
  "Return plain text under 140 words with three short sections: Situation, Timeline, Next Risk.",
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
