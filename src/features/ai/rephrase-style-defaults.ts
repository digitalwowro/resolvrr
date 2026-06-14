export type BuiltInRephraseStyle = {
  label: string;
  prompt: string;
  seedKey: string;
  sortOrder: number;
};

export const builtInRephraseStyles = [
  {
    label: "Professional",
    prompt:
      "Rewrite the draft in a polished, professional support tone while preserving the original meaning.",
    seedKey: "professional",
    sortOrder: 10,
  },
  {
    label: "Friendly",
    prompt:
      "Rewrite the draft in a friendly, approachable support tone while preserving the original meaning.",
    seedKey: "friendly",
    sortOrder: 20,
  },
  {
    label: "Empathetic",
    prompt:
      "Rewrite the draft with clear empathy and care while preserving the original meaning.",
    seedKey: "empathetic",
    sortOrder: 30,
  },
  {
    label: "Concise",
    prompt:
      "Rewrite the draft more concisely while preserving the original meaning and necessary detail.",
    seedKey: "concise",
    sortOrder: 40,
  },
] as const satisfies BuiltInRephraseStyle[];

export function builtInRephraseStylePrompt(seedKey: string | null): string | null {
  return (
    builtInRephraseStyles.find((style) => style.seedKey === seedKey)?.prompt ??
    null
  );
}
