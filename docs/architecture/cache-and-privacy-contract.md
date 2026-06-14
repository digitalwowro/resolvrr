# Cache And Privacy Contract

This contract defines the provider data cache rules, refresh states, and future
prompt context. The first implemented durable provider cache slice is limited to
selected-ticket detail/thread snapshots. The first AI output cache slice is
limited to selected-ticket generated summaries. Background sync, webhooks, and
job queues remain out of scope. Read-only AI behavior is defined separately in
`docs/architecture/read-only-ai-contract.md`.

## Goals

- Keep helpdesk providers as the source of truth for tickets and conversation
  content.
- Define what normalized provider data may be cached later.
- Define stale, refreshing, refresh-failed, and manual-refresh behavior before
  adding persistent cache.
- Define what AI prompts and generated-output cache entries may use before
  assisted AI features are implemented.
- Keep provider-specific fields, raw provider responses, credentials, and
  customer content out of logs.

## Current Implementation

- Selected-ticket detail reads may use a fresh encrypted database cache entry
  scoped by user, active helpdesk connection, provider ticket identity, and
  cache source version.
- Provider-source refreshes use an explicit persistent-cache bypass. Manual
  ticket refresh, stale visible-tab refresh, notification-triggered ticket
  refresh, and post-save detail refresh fetch provider source-of-truth rather
  than returning a fresh database cache hit.
- Provider detail refreshes write through to the selected-ticket detail cache.
- Confirmed metadata and communication writes invalidate the selected-ticket
  detail cache before the post-write provider refresh; successful refreshes
  write the refreshed detail back to cache.
- Successful helpdesk connection update, validation, disable, and delete
  actions clear selected-ticket detail cache entries scoped to that connection
  and user.
- The encrypted cache payload stores normalized provider-neutral ticket detail
  and thread data. Plaintext columns are limited to cache identity/freshness and
  narrow metadata used for scoping and invalidation.
- Selected-ticket AI summaries are cached as encrypted generated output. Their
  cache keys include user, active helpdesk connection, selected ticket, prompt
  version, sanitization version, provider protocol, model fingerprint, and
  source fingerprint/freshness metadata.
- Inline composer drafts are recovered locally in the browser. The local record
  is scoped by user, active workspace, selected ticket, and composer mode. It
  may contain the unsent draft body and up to three draft AI suggestions, and it
  expires after a short retention window.
- Workspace and per-user AI settings are encrypted server-side configuration,
  not cache data. Changing active-workspace AI policy/default config invalidates
  generated summaries for that workspace; changing a user's per-workspace AI
  config invalidates generated summaries for that user and connection.
- The current cache implementation does not cache list query pages, lookup data,
  background refresh jobs, webhooks, or provider raw payloads.

## Non-Goals

- No server-side draft suggestions, customer replies, or assisted-action output
  cache in this phase. Browser-local inline draft recovery is allowed only for
  unsent composer text and short-lived suggestion history.
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
- Browser-local draft content: unsent inline comment/reply bodies and local AI
  suggestion alternatives. This must not be logged or sent to the server except
  through explicit AI generation or Update actions chosen by the user.
- Secrets: provider credentials, session tokens, cookies, password material, and
  AI credentials. These are never cache data.

## Freshness Defaults

Future cache implementations may tune exact TTLs, but the default classes are:

- List snapshots: short lived, around 30-120 seconds.
- Detail snapshots: short lived, around 2-5 minutes.
- Thread snapshots: short lived, around 2-5 minutes.
- Lookup snapshots: medium lived, around 15-60 minutes when the provider does
  not return an explicit freshness hint.
- Generated AI output: selected-ticket summaries use a medium-lived encrypted
  cache, currently around 24 hours, keyed by source/model/prompt identity.
- Browser-local inline composer drafts: short lived, currently around 7 days,
  and cleared earlier when the user closes the composer, discards changes,
  submits through Update, or closes the ticket tab.

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
  thread snapshots plus generated selected-ticket summaries.
- Saved-view changes invalidate list snapshots keyed by that saved view.
- Helpdesk connection credential, active connection, or permission changes
  invalidate all snapshots scoped to that connection for that user.
- AI settings changes invalidate generated selected-ticket summaries scoped to
  the affected workspace or user/connection.
- Inline composer drafts are cleared locally when the user closes that composer,
  discards workspace changes, submits communication through Update, or closes
  the ticket tab.

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
Refresh paths that are semantically provider-source refreshes must bypass
fresh persistent detail cache reads. Normal initial selected-ticket detail loads
and unopened tab loads may use a fresh cache entry.

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
contract must make that freshness explicit. Selected-ticket summaries reload
selected-ticket detail from provider source on the server before prompt
preparation, then may reuse a generated-summary cache entry only when the
source fingerprint, prompt version, sanitization version, user scope, connection
scope, selected-ticket identity, provider protocol, and model fingerprint match.

Proofread and rephrase use only the current composer draft plus
workspace-scoped My Style. Rephrase also uses the selected workspace rephrase
style prompt or a permitted personal override for that style. Browser-local
draft recovery is not selected-ticket source context and does not authorize a
provider write.

## Observability

Telemetry records metadata-only cache events for the implemented provider detail
cache and AI summary cache paths:

- cache data kind;
- hit, miss, stale, bypass, refresh started, refresh succeeded, refresh
  failed, regeneration started, regeneration succeeded, regeneration failed,
  write succeeded, and write failed;
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
