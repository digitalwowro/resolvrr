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
- Merged source details are never cached as ordinary detail. Merge resolution
  invalidates source entries and stores only the final survivor under its own
  provider identity; the detail cache source version is bumped when this rule
  changes.
- A selected-ticket Update applies metadata first and its single communication
  last, then performs one coordinated cache invalidation and provider detail/list
  refresh. Successful refreshes write the refreshed detail back to cache.
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
- Ticket-level composer drafts use a workspace-lifetime memory controller with
  a versioned IndexedDB recovery buffer. Records are scoped by user, active
  workspace, personal helpdesk connection, provider identity version, and
  selected ticket. They
  may contain communication kind, source/intent/context version, reviewed To/Cc,
  the conversation-history inclusion choice plus reviewed opaque version/scope,
  forward subject and source attachment IDs, unsent body, and up to three draft AI
  suggestions. Draft records do not expire by age. Legacy comments
  restore directly; legacy replies restore
  only after their source receives a fresh valid context, using fresh defaults.
  Ticket-history HTML is never persisted; it is re-derived from the current
  provider-backed detail and rebuilt server-side immediately before the write.
  Mention tokens inside unsent HTML contain only a provider-neutral external
  user reference and the selected display label. Mention suggestion results are
  request-scoped lookups and are not cached or persisted as a directory.
- Composer drafts are local-only. The controller performs no provider draft
  reads, writes, polling, or focus reconciliation. It stages each edit in memory,
  coalesces browser recovery writes after typing pauses, and flushes pending work
  on ticket or page lifecycle changes. Healthy persistence stays visually silent;
  only recovery-storage failures are surfaced. IndexedDB is not cross-browser,
  cross-device, or cross-application synchronization.
- Workspace and per-user AI settings are encrypted server-side configuration,
  not cache data. Changing active-workspace AI policy/default config invalidates
  generated summaries for that workspace; changing a user's per-workspace AI
  config invalidates generated summaries for that user and connection.
- The current cache implementation does not cache list query pages, lookup data,
  background refresh jobs, webhooks, or provider raw payloads.

## Non-Goals

- No server-side Resolvrr draft cache, provider draft synchronization, customer
  replies, or assisted-action output cache exists in this phase. Authored
  content and AI suggestions remain only in the identity-scoped browser
  recovery record until the user submits Update.
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

Interactive global ticket searches are deliberately not cached in the database.
The browser may retain only the raw query in `sessionStorage`, scoped by user,
workspace, personal connection, and provider identity version. Search result
rows, totals, and cursors remain in active client memory and are discarded on
reload or identity change.

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
- provider-classified visible attachment metadata only: filename, content type,
  and byte size; provider-internal inline resources and message alternatives are
  excluded;
- thread `fetchedAt`, `expiresAt`, and `sourceVersion`.

Thread snapshots must not contain raw article bodies, unsanitized HTML, raw
provider attachment URLs, attachment bytes, provider auth details, or provider
response bodies. Sanitized HTML may contain authenticated same-origin inline-image
paths, but inline-image responses are fetched on demand with `private, no-store`
and are never written to the ticket cache. If sanitized customer content is
persisted later, the cache implementation must treat it as sensitive content and
encrypt it at rest.

Visible attachment bytes are also fetched only after an authenticated,
connection-owned request and fresh provider revalidation. Download responses use
`private, no-store`, force attachment disposition, and are never written to the
ticket, thread, browser, or AI caches.

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
- Personal draft content: unsent comment/reply/forward bodies, recipient
  selections, source context identifiers/versions, and local AI suggestion
  alternatives. It must never be logged. The authored communication projection
  may cross the authenticated server boundary only for the signed-in user's
  provider taskbar synchronization; local AI alternatives are excluded.
- Secrets: provider credentials, session tokens, cookies, password material, and
  AI credentials. These are never cache data.

## Freshness Defaults

Future cache implementations may tune exact TTLs, but the default classes are:

- List snapshots: short lived, around 30-120 seconds.
- Detail snapshots: short lived, around 2-5 minutes.
- Thread snapshots: short lived, around 2-5 minutes.
- Lookup snapshots: medium lived, around 15-60 minutes when the provider does
  not return an explicit freshness hint.
- Generated AI output: selected-ticket summaries use a durable encrypted cache
  keyed by complete source/model/prompt identity. Age alone never hides an
  exact matching summary.
- Browser-local ticket composer drafts: retained until confirmed communication
  success or an explicit, confirmed discard. Closing a tab may retain the draft;
  age alone never removes the recovery record.

Any TTL can be shortened for sensitive data, provider errors, permission
changes, or high-churn views. Expired snapshots may be shown only as stale data
when the UI clearly exposes that state and a refresh path exists.
Generated summaries are the exception: fingerprint changes and explicit
invalidation—not elapsed time—control whether they remain reusable.

## Invalidation Rules

Provider writes must invalidate affected cached reads after the provider
confirms the write:

- Metadata writes invalidate selected-ticket detail, affected list rows, and
  list/group snapshots that could contain the ticket.
- Owner/group/tag/link/subscription writes invalidate selected-ticket detail,
  affected list rows, and any related lookup-derived display where applicable.
- Internal notes, customer replies, and customer forwards invalidate selected-ticket detail and
  thread snapshots plus generated selected-ticket summaries.
- Saved-view changes invalidate list snapshots keyed by that saved view.
- Helpdesk connection credential, active connection, or permission changes
  invalidate all snapshots scoped to that connection for that user.
- Provider-derived ticket, thread, and generated-summary caches belong to the
  signed-in user's personal helpdesk connection, never to shared workspace
  membership. Missing personal credentials must fail before a cache read.
- Changing a workspace provider URL invalidates every member connection,
  rotates identity versions, and deletes every provider-derived cache for that
  workspace. Ownership transfer does not change cache ownership.
- AI settings changes invalidate generated selected-ticket summaries scoped to
  the affected workspace or user/connection.
- Ticket composer drafts survive validation, provider, partial-success, and
  uncertain-delivery failures. A clear is first persisted as pending, then
  removed locally only after the personal provider confirms its task draft was
  cleared. Provider conflicts retain the recovery copy and require an explicit
  local/provider choice.
- Browser drafts are keyed by user, workspace, personal helpdesk connection,
  connection identity version, and ticket. Disconnect/reconnect, provider URL
  replacement, or provider identity rotation prevents an older draft from
  restoring. Legacy drafts from shared credentials are intentionally ignored.
- A merged source draft is never transferred to its survivor. It remains scoped
  to the retired source until explicit discard, and any
  attempted source write is rejected by provider lifecycle preflight.

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
For ticket lists, a successful refresh atomically replaces the complete loaded
saved-view page window rather than merging back rows omitted by the provider.
If any loaded page cannot be refreshed, the prior window remains visible.
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
Structured summary cache payloads are decrypted and schema-validated before
hydration. Invalid or legacy free-form payloads are cache misses and never reach
the client.

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
