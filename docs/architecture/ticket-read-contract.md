# Ticket Read Contract

This is the provider-neutral contract for the first provider-backed ticket read
path. It defines the data shape core features may consume and the provider
capabilities core features may call. It does not introduce ticket mutations.

## Canonical Values

Ticket state values are stable machine keys:

- `new`
- `open`
- `pending_reminder`
- `pending_close`
- `closed`

Ticket priority values are stable machine keys:

- `low`
- `medium`
- `high`

UI labels come from the core definitions in `src/core/tickets.ts`. Provider
plugins map raw provider states and priorities into these keys. Unknown provider
values should be omitted rather than surfaced as raw provider-specific data.

## Ticket Shape

`Ticket` is the canonical provider-neutral ticket record. It uses provider-local
external IDs because Resolvrr may connect multiple helpdesk systems over time.

Required fields:

- `externalId`: provider-local ticket ID.
- `number`: provider-facing ticket number or display identifier.
- `title`: ticket title.
- `updatedAt`: provider update time.
- `tags`: canonical tag names, normalized by the provider plugin.

Optional fields:

- `customer`, `owner`: provider-neutral participants with optional external ID,
  name, email, and role.
- `group`: provider-neutral assignment group reference.
- `state`, `priority`: canonical values listed above.
- `createdAt`, `pendingUntil`: timestamps when the provider exposes them.
- `providerUrl`: direct URL to the provider ticket when the provider can build
  it safely.

`TicketListItem` extends `Ticket` with optional `textPreview` for dense lists.
List rows must not depend on provider-specific raw fields.

## Thread And Articles

`TicketThread` belongs to one ticket and contains ordered `TicketArticle`
records. An article is a provider-neutral conversation entry, not a mutation
command.

Article fields include:

- `externalId`: provider-local article ID.
- `kind`: `message`, `note`, `system_event`, or `unknown`.
- `visibility`: `public` or `internal`.
- `direction`: `inbound`, `outbound`, `internal`, `system`, or `unknown`.
- `author`: provider-neutral participant.
- `recipients`: provider-neutral participant references with `to`, `cc`, or
  `bcc` channel.
- `createdAt`: provider article timestamp.
- `sanitizedHtml`: server-sanitized article body.
- `attachments`: metadata only. Attachment download is outside this slice.

Provider plugins must sanitize provider HTML before returning articles to core
features. Raw provider article bodies are not part of the contract.

## Detail Shape

`TicketDetail` contains:

- `ticket`: canonical `Ticket`.
- `thread`: canonical `TicketThread`.
- `links`: provider-neutral parent, child, or related ticket links.
- `subscription`: optional follow state when supported.
- `measuredAt`: server time when the provider read was measured.

## Provider Capabilities

Read-path capabilities:

- `ticket:list`: provider can return paginated ticket list items.
- `ticket:count`: provider can count tickets for a saved view filter.
- `ticket:detail`: provider can return ticket detail with thread articles.
- `ticket:links`: detail includes provider-neutral related ticket links.
- `ticket:subscription`: detail includes follow/subscription state.
- `lookup:assignable-users`: provider can list assignable users.
- `lookup:groups`: provider can list assignment groups.
- `search:full-text`: provider can compile saved-view full-text search.

Provider methods are capability-gated. Core features must check capability
presence before calling optional provider read methods. Mutation capabilities
remain named for future slices, but this contract does not approve or implement
mutation workflows.

## Query And Pagination

Ticket list reads use `TicketListQuery`:

- `filter`: provider-neutral saved-view filter.
- `cursor`: opaque provider cursor returned by the previous read.
- `limit`: maximum number of list items to return.
- `sort`: optional provider-neutral sort key and direction.

`TicketListResult.nextCursor` is opaque to core code. Providers own cursor
format, pagination compilation, and raw response mapping.

## Non-Goals

- Ticket create, update, merge, split, reply, note, assignment, tagging, and
  subscription mutations.
- Attachment downloads or previews.
- Provider-backed ticket caching policy.
- Zammad read implementation.
