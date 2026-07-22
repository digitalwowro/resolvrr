export const ticketSearchQueryMaxLength = 1_000;

export type TicketSearchQueryValidation =
  | { status: "valid"; query: string }
  | { status: "invalid"; reason: "empty" | "control-characters" | "too-long" };

function containsControlCharacter(value: string) {
  return [...value].some((character) => {
    const codePoint = character.codePointAt(0);
    return codePoint !== undefined && (codePoint <= 31 || codePoint === 127);
  });
}

export function validateTicketSearchQuery(
  value: string,
): TicketSearchQueryValidation {
  const query = value.trim();
  if (!query) {
    return { status: "invalid", reason: "empty" };
  }
  if (query.length > ticketSearchQueryMaxLength) {
    return { status: "invalid", reason: "too-long" };
  }
  if (containsControlCharacter(query)) {
    return { status: "invalid", reason: "control-characters" };
  }
  return { status: "valid", query };
}
