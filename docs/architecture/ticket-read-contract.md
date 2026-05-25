# Ticket Contract

This is the provider-neutral contract for provider-backed ticket reads and the
first controlled metadata mutation slice. It defines the data shape core
features may consume and the provider capabilities core features may call.

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
- `sanitizedHtml`: server-sanitized article body. Safe rich-text structure such
  as links, lists, headings, tables, and inline emphasis may be preserved by the
  sanitizer; scripts, unsafe attributes, and unsafe URL schemes are not part of
  the contract.
- `attachments`: metadata only. Attachment download is outside this slice.

Provider plugins must sanitize provider HTML before returning articles to core
features. Raw provider article bodies are not part of the contract. UI code
renders `sanitizedHtml` as read-only rich text and must not reintroduce raw
provider HTML.

## Controlled Metadata Mutations

The approved mutation contract is limited to state and priority. Core, service,
and UI code use canonical Resolvrr keys:

- `TicketMetadataMutationInput.state?: TicketState`
- `TicketMetadataMutationInput.priority?: TicketPriority`

Provider plugins own mapping from those keys to provider-specific raw values.
Zammad raw values such as `pending reminder` or `2 normal` must not escape
`src/providers/zammad/**`.

The provider-neutral mutation capabilities are:

- `ticket:update-state`
- `ticket:update-priority`

No owner, group, tag, reply, link, or subscription mutation capability is
approved in this slice.

Mutation results distinguish write failure from refresh failure:

- `saved`: provider write succeeded and the affected list/detail refresh check
  succeeded.
- `failed`: provider write did not complete or was not allowed.
- `saved-refresh-failed`: provider write succeeded, but the post-write
  list/detail refresh check failed. UI must present this as non-destructive and
  must not pretend the write failed.

The UI does not optimistic-update metadata. It submits the mutation, shows a
pending state, and refreshes the workspace after a successful checked write.

## Detail Shape

`TicketDetail` contains:

- `ticket`: canonical `Ticket`.
- `thread`: canonical `TicketThread`.
- `links`: provider-neutral parent, child, or related ticket links.
- `subscription`: provider-neutral follow state.
- `measuredAt`: server time when the provider read was measured.

Unsupported optional provider features still use one stable detail shape:

- If `ticket:links` is unsupported, `links` is always `[]`.
- If `ticket:subscription` is unsupported, `subscription` is always
  `{ supported: false, following: false }`.

UI code must not infer capability support by checking for missing fields.
Capability checks remain explicit through the provider contract.

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

Mutation capabilities:

- `ticket:update-state`: provider can update the canonical ticket state.
- `ticket:update-priority`: provider can update the canonical ticket priority.

Provider methods are capability-gated. Core features must check capability
presence before calling optional provider methods.

Provider read calls receive a provider-neutral request security context:

- `requestSecurity.validatedAddresses`: the public address set produced by
  server-side base URL validation and reused by provider-safe request helpers.

This is documented as SSRF revalidation output. It is not a Zammad shape and it
does not expose HTTP implementation details to core ticket types.

## Query And Pagination

Ticket list reads use `TicketListQuery`:

- `filter`: provider-neutral saved-view filter.
- `cursor`: opaque provider cursor returned by the previous read.
- `limit`: maximum number of list items to return.
- `sort`: optional provider-neutral sort key and direction.

`TicketListResult.nextCursor` is opaque to core code. Providers own cursor
format, pagination compilation, and raw response mapping.

## Read And Mutation Coordination

Provider-backed reads stay coordinated at the service/provider boundary:

- Ticket list loading is one provider read path.
- Selected ticket detail/thread loading is one provider read path.
- UI components do not fetch provider data directly.
- UI components do not call provider code directly for mutations.
- State and priority mutations go through the ticket service/action layer.
- Detail metadata, thread articles, tags, links, subscription, and lookup data
  must not be added as independent component-level fetches.

The read path logs sanitized timing metadata for these phases:

- active connection lookup;
- credential decrypt;
- base URL security revalidation;
- provider list request;
- provider detail metadata request;
- provider article/thread request;
- provider user lookup request;
- provider mapping/parsing;
- total list load;
- total selected-ticket detail load.
- provider metadata mutation request;
- total metadata mutation.

Future secondary data such as tags, links, subscription, and lookup lists must
be added as explicit measured phases when they become part of the coordinated
read path. This contract does not introduce Redis, database caches,
stale-while-revalidate, background sync, or cache abstractions.

## Non-Goals

- Ticket create, merge, split, reply, note, owner/group assignment, tagging,
  link, and subscription mutations.
- Attachment downloads or previews.
- Provider-backed ticket caching policy.
- Saved-view management, background sync, or AI workflows.
