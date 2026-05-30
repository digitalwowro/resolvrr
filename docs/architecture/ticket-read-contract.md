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
- `metadataMutationConstraints`: provider-neutral state mutation UI constraints
  expressed with canonical state keys and user-safe reasons.

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
- `attachments`: metadata only. The workspace may display provider-neutral
  filename, content type, and byte size values. Attachment download, proxying,
  previews, raw provider attachment URLs, and provider auth details are outside
  this slice and must stay provider-bound until a separate attachment security
  model is approved.

Provider plugins must sanitize provider HTML before returning articles to core
features. Raw provider article bodies are not part of the contract. UI code
renders `sanitizedHtml` as read-only rich text and must not reintroduce raw
provider HTML.

## Controlled Metadata Mutations

The approved mutation contract is limited to state and priority. Core, service,
and UI code use canonical Resolvrr keys:

- `TicketMetadataMutationInput.state?: TicketState`
- `TicketMetadataMutationInput.priority?: TicketPriority`
- `TicketMetadataMutationInput.pendingUntil?: Date`, used only as supporting
  data for state transitions that require a pending time.

The workspace sends one selected-ticket update payload for each explicit
`Update` click. That payload carries the selected ticket external ID and a
provider-neutral metadata slice; the server action parses and validates it
before dispatching the existing provider-neutral mutation input. Server-side
validation remains authoritative even when the client has already disabled
invalid submits. Unsupported future slices such as owner, group, tags, links,
notes, or replies are rejected at the action boundary until their
provider-neutral contracts and capability checks are explicitly implemented.

Provider plugins own mapping from those keys to provider-specific raw values.
Zammad raw values such as `pending reminder`, `2 normal`, or `pending_time`
must not escape `src/providers/zammad/**`.

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
Providers may attach per-ticket state mutation constraints when a provider has
stricter state-transition rules than the canonical model. These constraints can
hide unavailable state options or require supporting pending-date input for
specific canonical states. Provider raw values and provider-specific decisions
remain inside the provider plugin.

## Detail Shape

`TicketDetail` contains:

- `ticket`: canonical `Ticket`.
- `thread`: canonical `TicketThread`.
- `links`: provider-neutral parent, child, or related ticket links, with
  optional provider URLs for linked tickets.
- `subscription`: provider-neutral follow state.
- `measuredAt`: server time when the provider read was measured.

Optional provider-neutral features that are not advertised still use one stable
detail shape:

- If `ticket:links` is not advertised, `links` is always `[]`.
- If `ticket:subscription` is not advertised, `subscription` is always
  `{ supported: false, following: false }`.

UI code must not infer capability support by checking for missing fields.
Capability checks remain explicit through the provider contract.

## Provider Capabilities

Read-path capabilities:

- `ticket:list`: provider can return paginated ticket list items.
- `ticket:count`: provider can count tickets for a saved view filter.
- `ticket:sort`: provider can apply provider-backed list sort requests.
- `ticket:group`: provider can return provider-backed list grouping buckets.
- `ticket:group-count`: provider can safely return total counts for grouped
  buckets. This is separate from `ticket:group` because grouped count queries
  can be materially more expensive than grouped row reads.
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
- `pageSize`: maximum number of list items requested for the current page.
- `cursor`: opaque provider cursor returned by the previous read.
- `sort`: optional provider-neutral sort key and direction, using canonical
  ticket field names such as `updatedAt`, `priority`, and `state`.
- `count`: optional request for provider-neutral count metadata, currently
  limited to whether a total count is requested.
- `group`: optional provider-neutral bucket request keyed by `state`,
  `priority`, `owner`, `customer`, or `group`.

The provider-neutral list query guardrail model exposes these capabilities to
features:

- `totalCount`: backed by `ticket:count`.
- `providerSort`: backed by `ticket:sort`.
- `providerGrouping`: backed by `ticket:group`.
- `groupedTotalCount`: backed by `ticket:group-count`.
- `fullTextSearch`: backed by `search:full-text`.
- `maxPageSize`: currently 50.
- `unsupportedCombinations`: currently includes `grouped-total-count` unless
  the provider explicitly advertises `ticket:group-count`.

The ticket service constrains requested page size to the provider-neutral hard
range of 1 to 50 before provider dispatch. Unsupported count, explicit
provider-backed sort, grouping, and full-text query requests return a
provider-neutral `unsupported-query` unavailable state before provider code is
called. Grouped total counts without `ticket:group-count` return
`query-too-expensive`. Query normalization drops unknown fields so raw provider
query syntax cannot be forwarded through the provider-neutral service boundary.
For ungrouped list reads, the service automatically requests total counts when
the active provider advertises `ticket:count`; providers without that capability
keep returning loaded-count-only list results.

Workspace saved views use the same provider-neutral guardrails before selecting
a default view. If the user's default saved view requires unsupported search,
sort, grouping, or grouped total-count behavior for the active provider, the
workspace falls back to the provider-neutral "All tickets" view and keeps the
unsupported saved view visible but disabled with a provider-neutral warning.

Workspace list sorting uses this same contract: when the active provider
advertises `providerSort`, changing a table sort requests page 1 with the
selected provider-neutral sort and subsequent page loads keep that sort. When a
list is incomplete and provider-backed sort is unavailable, the workspace does
not locally sort the partial subset as if it were complete.

Workspace state and priority grouping use provider-backed buckets when the
active provider advertises `providerGrouping`. The workspace requests the first
page of each provider bucket with grouped totals, and subsequent bucket loads
request the next page only for that bucket. Owner, customer, and group grouping
remain local-only for providers without grouping support and are not implemented
as provider-backed buckets yet.

`TicketListResult.loadedCount` is the number of list items returned in the
current response. `TicketListResult.totalCount`, when present, is the provider's
total count for the query rather than the size of the loaded subset. Bucket
results follow the same split: each bucket carries its loaded row count,
optional total count, optional next cursor, and provider-neutral rows.
Zammad-backed totals are sourced from the ticket search endpoint's
`with_total_count=true` response rather than by fetching every ticket page;
state and priority bucket totals use the same count-backed search path.

`TicketListResult.nextCursor` is opaque to core code. Providers own cursor
format, pagination compilation, raw query syntax, and raw response mapping.
Post-hydration ungrouped list pagination requests the next cursor through a
server action and appends the returned provider-neutral rows in active
workspace memory. Selected ticket detail/thread loading remains a separate read
path and is not triggered by loading more list rows.

## Read And Mutation Coordination

Provider-backed reads stay coordinated at the service/provider boundary:

- Ticket list loading is one provider read path.
- Selected ticket detail/thread loading is one provider read path.
- UI components do not fetch provider data directly.
- UI components do not call provider code directly for mutations.
- Staged single-ticket state and priority mutations go through the ticket
  service/action layer after one explicit `Update` submit.
- Detail metadata, thread articles, tags, links, subscription, and lookup data
  must not be added as independent component-level fetches.

The read path logs sanitized timing metadata for these phases:

- active connection lookup;
- credential decrypt;
- base URL security revalidation;
- provider list request;
- provider detail metadata request;
- provider article/thread request;
- provider secondary tags request;
- provider secondary links request;
- provider secondary group lookup request;
- provider lookup request;
- provider user lookup request;
- provider mapping/parsing;
- total list load;
- total selected-ticket detail load;
- provider metadata mutation current-ticket request;
- provider metadata mutation request;
- total metadata mutation.

Lookup lists use provider-neutral `{ externalId, label }` options and are read
through the selected-ticket detail service path. If supported lookup reads fail,
the selected ticket detail remains available and the failed lookup list is
marked unavailable. Lookup data uses request-scoped cache policy only; the
workspace may reuse it through the existing active-session detail cache, but
this contract does not introduce localStorage/sessionStorage, database caches,
Redis, stale-while-revalidate, background sync, or cache abstractions.

Secondary data such as tags, links, subscription, and lookup lists must be added
as explicit measured phases when they become part of the coordinated read path.
Optional secondary read failures should not take down an otherwise available
selected-ticket detail when a provider-neutral fallback is available.

## Non-Goals

- Ticket create, merge, split, reply, note, owner/group assignment, tagging,
  link, and subscription mutations.
- Attachment downloads or previews.
- Provider-backed ticket caching policy.
- Saved-view management, background sync, or AI workflows.
