# Ticket Search Contract

Global ticket search is a provider-backed collection read across every ticket
readable through the signed-in user's personal helpdesk connection. It is
independent of the active saved view and never filters only the rows already
loaded in the browser.

## Query And Provider Boundary

Search uses the existing provider-neutral `TicketListQuery` with only
`filter.searchText`, count, cursor, page-size, and scalar sort data. It never
inherits saved-view filters or grouping.

Core validation trims outer whitespace, rejects empty values, control
characters, and values longer than 1,000 characters. It preserves quoted
phrases, field clauses, ranges, boolean operators, wildcards, regular
expressions, and other provider-supported advanced syntax. Provider plugins own
syntax compilation and provider syntax errors.

The Zammad provider wraps the requested expression, combines it with its
provider-owned merged-ticket exclusion, and uses the ticket search endpoint
before pagination and totals. Closed tickets remain eligible. HTTP 400/422
responses for a full-text request map to a provider-neutral, non-retryable
`invalid-search-query` result.

## Workspace Behavior

After a 500 ms pause, the header shows up to ten quick results with the real
provider total. `Enter` or `View all results` opens a separate, flat detailed
result list that requests 100 rows and follows provider cursors. Selecting a
result opens the normal local ticket tab.

Search owns a separate controller from saved-view paging. Clearing it restores
the unchanged saved-view rows, grouping, sorting, and selection context.
Detailed search retains its prior rows when a refresh or replacement query
fails and suppresses late responses from older queries or identities.

Scalar columns use provider-backed sorting. Relationship-label sorting remains
disabled until a complete-result search sort can preserve visible-name
ordering rather than sorting opaque provider IDs.

## Privacy And Refresh

Raw queries never enter URLs, logs, telemetry, database records, or durable
caches. The browser may retain only the query in `sessionStorage`, scoped by
user, workspace, personal connection, and provider identity version. Search
rows, totals, and cursors remain in active client memory.

Search does not poll continuously. Agents can refresh explicitly, and a
detailed result older than one minute refreshes when the workspace regains
focus.
