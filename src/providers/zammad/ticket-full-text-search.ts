import { ProviderError } from "@/core/providers";
import { validateTicketSearchQuery } from "@/core/ticket-search";

export function zammadFullTextSearchClause(
  searchText: string | undefined,
): string | undefined {
  if (searchText === undefined) {
    return undefined;
  }

  const validation = validateTicketSearchQuery(searchText);
  if (validation.status === "invalid") {
    throw new ProviderError(
      "validation-failure",
      "The ticket search query is invalid.",
      false,
      undefined,
      "invalid-search-query",
    );
  }

  return validation.query;
}

export function invalidZammadSearchResponse(error: unknown) {
  return (
    error instanceof ProviderError &&
    (error.statusCode === 400 || error.statusCode === 422)
  );
}

export function invalidZammadSearchError(statusCode?: number) {
  return new ProviderError(
    "validation-failure",
    "The ticket search query is invalid.",
    false,
    statusCode,
    "invalid-search-query",
  );
}
