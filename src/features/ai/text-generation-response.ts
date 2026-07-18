function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function extractOpenAiText(payload: unknown): string | undefined {
  if (!isRecord(payload) || !Array.isArray(payload.choices)) {
    return undefined;
  }
  const [choice] = payload.choices;
  if (!isRecord(choice) || !isRecord(choice.message)) {
    return undefined;
  }
  const { content } = choice.message;
  if (typeof content === "string") {
    return content.trim();
  }
  if (Array.isArray(content)) {
    return content
      .map((part) =>
        isRecord(part) && typeof part.text === "string" ? part.text : "",
      )
      .join("")
      .trim();
  }
  return undefined;
}

export function openAiResponseWasTruncated(payload: unknown): boolean {
  if (!isRecord(payload) || !Array.isArray(payload.choices)) {
    return false;
  }
  const [choice] = payload.choices;
  return isRecord(choice) && choice.finish_reason === "length";
}

export function extractAnthropicText(payload: unknown): string | undefined {
  if (!isRecord(payload) || !Array.isArray(payload.content)) {
    return undefined;
  }
  return payload.content
    .map((part) =>
      isRecord(part) && part.type === "text" && typeof part.text === "string"
        ? part.text
        : "",
    )
    .join("")
    .trim();
}

export function anthropicResponseWasTruncated(payload: unknown): boolean {
  return isRecord(payload) && payload.stop_reason === "max_tokens";
}
