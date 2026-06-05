# Cache And Privacy Contract

This contract defines the Phase 9 rules for provider data caching, refresh
states, and future prompt context. It is intentionally a contract only: this
phase does not add database-backed provider cache, generated output cache,
background sync, webhooks, or job queues. Read-only AI behavior is defined
separately in `docs/architecture/read-only-ai-contract.md`.

## Goals

- Keep helpdesk providers as the source of truth for tickets and conversation
  content.
- Define what normalized provider data may be cached later.
- Define stale, refreshing, refresh-failed, and manual-refresh behavior before
  adding persistent cache.
- Define what AI prompts may read before durable provider or output caching is
  implemented.
- Keep provider-specific fields, raw provider responses, credentials, and
  customer content out of logs.

## Non-Goals

- No durable cache tables or migrations in this phase.
- No generated summaries, draft suggestions, or output cache in this phase.
- No background sync, webhooks, scheduled refresh jobs, or hidden provider
  writes in this phase.
- No provider-specific cache keys, query syntax, raw API paths, or raw payload
  shapes in core, feature, UI, or provider-neutral docs.
- No use of cached data to trigger provider writes.

## Ownership

The helpdesk provider remains the source of truth. Resolvrr may later persist
disposable normalized snapshots to improve repeated reads, but those snapshots
must be scoped and invalidated so they cannot become a local ticket system.

Cache records must be scoped at minimum by:

- Resolvrr user.
- Helpdesk connection.
- Provider key.
- Provider-local external resource identity.
- Normalized data kind.
- Contract/schema version.

Provider-local external IDs may be used as resource identities, but raw provider
payloads, raw endpoint URLs, raw query strings, credentials, cookies, tokens,
and provider response bodies are not cache contract data.

## Cacheable Data

### List Snapshots

List snapshots may contain provider-neutral ticket list rows and list metadata:

- canonical ticket fields used by the table;
- provider-neutral customer, owner, group, state, priority, tag, pending, and
  timestamp display data;
- loaded count, total count, cursor, grouping, and sort metadata;
- saved-view/query identity using provider-neutral query shape;
- cache `fetchedAt`, `expiresAt`, and `sourceVersion`.

List snapshots must not contain raw provider query syntax, raw provider filter
payloads, provider response bodies, credentials, or communication bodies beyond
the normalized row preview already returned by the ticket read contract.

### Detail Snapshots

Detail snapshots may contain normalized selected-ticket detail:

- canonical ticket metadata;
- provider-neutral links, tags, subscription state, owner/group display, and
  lookup-derived labels;
- provider-neutral mutation constraints;
- detail `fetchedAt`, `expiresAt`, and `sourceVersion`.

Detail snapshots must not contain raw provider objects, raw mutation payloads,
or provider response bodies.

### Thread Snapshots

Thread snapshots may contain provider-neutral article records:

- article kind, visibility, direction, author, recipients, and timestamp;
- sanitized article HTML or derived plain text if the future implementation
  needs it for display or prompt preparation;
- attachment metadata only: filename, content type, and byte size;
- thread `fetchedAt`, `expiresAt`, and `sourceVersion`.

Thread snapshots must not contain raw article bodies, unsanitized HTML, raw
provider attachment URLs, attachment bytes, provider auth details, or provider
response bodies. If sanitized customer content is persisted later, the cache
implementation must treat it as sensitive content and encrypt it at rest.

### Lookup Data

Lookup snapshots may contain provider-neutral options for owner, group, tag,
current user, and link-target searches when supported:

- option label;
- provider-local external ID where needed for explicit user actions;
- capability and unavailable-state metadata;
- `fetchedAt`, `expiresAt`, and `sourceVersion`.

Lookup snapshots must not be used as authorization proof. Provider writes must
still be validated by the provider at submit time.

## Sensitivity Classes

Cached data must be classified before persistence:

- Public app metadata: saved-view IDs, cache status, capability names, and safe
  timing metadata. This can be stored unencrypted beyond normal database
  controls.
- Provider metadata: ticket numbers, provider-local external IDs, state,
  priority, owner/group labels, tags, and timestamps. This must be scoped to
  user and helpdesk connection.
- Customer content: ticket titles, previews, sanitized thread content,
  recipients, note bodies, reply bodies, and generated text based on customer
  content. This must not be logged and must be encrypted at rest if persisted.
- Secrets: provider credentials, session tokens, cookies, password material, and
  AI credentials. These are never cache data.

## Freshness Defaults

Future cache implementations may tune exact TTLs, but the default classes are:

- List snapshots: short lived, around 30-120 seconds.
- Detail snapshots: short lived, around 2-5 minutes.
- Thread snapshots: short lived, around 2-5 minutes.
- Lookup snapshots: medium lived, around 15-60 minutes when the provider does
  not return an explicit freshness hint.
- Generated AI output: not part of Phase 9; it belongs to the later output cache
  phase after read-only AI exists.

Any TTL can be shortened for sensitive data, provider errors, permission
changes, or high-churn views. Expired snapshots may be shown only as stale data
when the UI clearly exposes that state and a refresh path exists.

## Invalidation Rules

Provider writes must invalidate affected cached reads after the provider
confirms the write:

- Metadata writes invalidate selected-ticket detail, affected list rows, and
  list/group snapshots that could contain the ticket.
- Owner/group/tag/link/subscription writes invalidate selected-ticket detail,
  affected list rows, and any related lookup-derived display where applicable.
- Internal notes and customer replies invalidate selected-ticket detail and
  thread snapshots.
- Saved-view changes invalidate list snapshots keyed by that saved view.
- Helpdesk connection credential, active connection, or permission changes
  invalidate all snapshots scoped to that connection for that user.

Invalidation must not be treated as provider write success. Provider write
success still comes only from the provider write result. Refresh failure after a
confirmed write remains a distinct `saved-refresh-failed` state.

## Refresh States

Provider-backed surfaces may use these states:

- `fresh`: data is within its freshness window or was just loaded from the
  provider.
- `stale`: data is expired or older than the active freshness window, but is
  still displayable with a visible stale indicator.
- `refreshing`: a provider refresh is in progress while prior data remains
  visible.
- `refresh-failed`: the refresh failed and prior data may remain visible only
  with a clear non-destructive failure state.
- `unavailable`: no safe cached data or provider result can be shown.

The workspace must not silently show stale data as fresh. Manual refresh should
request provider source-of-truth data and update the visible freshness state.

## Reads That May Use Stale Data

Stale data may be used for:

- returning to an already opened ticket tab while refresh starts;
- keeping the list visible during manual refresh;
- showing lookup labels when the current provider lookup is temporarily
  unavailable;
- non-critical display metadata when a fresh provider read is pending.

Stale data must not be used for:

- proving write permissions;
- deciding a provider mutation is valid;
- auto-sending communication;
- hiding provider errors;
- silently feeding future AI prompts without a visible freshness decision.

## AI Prompt Readiness

Read-only AI may use only provider-neutral, sanitized source data:

- selected ticket title, state, priority, owner/group labels, tags, links, and
  timestamps;
- sanitized thread text derived from sanitized article HTML;
- article metadata needed to distinguish public replies, internal notes, and
  system entries;
- source freshness metadata and selected-ticket identity.

Future AI prompts must not include:

- provider credentials, tokens, cookies, or auth headers;
- raw provider response bodies;
- raw provider request bodies;
- raw provider endpoint paths or query syntax;
- raw provider-local article IDs unless needed only as non-prompt source
  identity outside the model input;
- attachment bytes or raw provider attachment URLs;
- logs of prompts, generated replies, provider payloads, or raw customer
  content.

Before an AI request uses stale or persisted source data, the UI and service
contract must make that freshness explicit. The default behavior for
selected-ticket summaries is to reload selected-ticket detail on the server
before generation.

## Observability

Telemetry may record metadata-only cache events:

- cache data kind;
- hit, miss, stale hit, refresh started, refresh succeeded, refresh failed;
- provider key and helpdesk connection ID;
- normalized capability name;
- duration and retryability;
- freshness age bucket, not raw content.

Telemetry must not record ticket bodies, thread bodies, prompts, generated
output, provider response bodies, credentials, recipient addresses, provider
local ticket IDs, article IDs, or raw customer content.

## Future Implementation Acceptance

Before a later phase implements durable provider cache or AI output cache, it
must:

- follow this contract or update it in the same change;
- add typed schema/config validation for any new environment variables;
- add migrations only for the specific persisted data being introduced;
- encrypt sensitive cached customer content at rest;
- update privacy and deployment docs;
- add focused tests for TTL, invalidation, stale state, and logging behavior;
- run provider-boundary and security checks when provider-backed data or AI
  prompt handling changes.
