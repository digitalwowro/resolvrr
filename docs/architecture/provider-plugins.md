# Provider Plugin Boundary

Provider plugins adapt external helpdesk systems to the Resolvrr contract. Core
code should not know provider API routes, raw field names, query syntax, or
credential details.

## Core Owns

- Provider-neutral ticket, saved view, connection, and error contracts.
- Canonical ticket read shapes and capabilities documented in
  `docs/architecture/ticket-read-contract.md`.
- Provider registry lookup and capability-aware rendering.
- Credential storage and encryption policy.
- Cache scope, retention, and invalidation rules.
- User-safe error display.

## Provider Plugins Own

- Credential schemes and validation.
- Provider-owned `validateConnection(input)` behavior. Providers do not need to
  expose a generic health endpoint.
- API clients and request construction.
- Raw response DTOs and canonical value mapping.
- Query/filter compilation.
- Provider-specific pagination, rate limits, and failure classification.
- Provider-specific tests and fixtures.

## Registration Rule

Core modules consume `HelpdeskProviderPlugin` through the registry contract.
`src/providers/available-providers.ts` is the single installed-provider assembly
file allowed to import provider plugins directly. Core UI, domain, feature, and
data files must not import provider plugin internals.

## Connection Security

Core connection management validates and normalizes user-provided base URLs
before storing them and again immediately before provider validation. Provider
plugins receive only the revalidated canonical base URL and server-side
credentials. Validation requests must bind provider HTTPS requests to the
revalidated address set and reject private or changed DNS results at request
time. Validation requests must avoid automatic redirects so credentials are not
sent to an unvalidated redirect target.

## Ticket Request Security

Provider-backed ticket reads and controlled metadata writes must use the
provider-safe request helpers in `src/security/provider-http.ts`. Provider code
must not use raw `fetch()`. Ticket requests must keep the same SSRF properties
as connection validation:

- HTTPS only.
- DNS resolution checked against the validated public address set.
- Request lookup pinned to the selected validated address.
- Fallback only across validated public addresses.
- No automatic redirects.
- Abort-signal timeout support.
- Explicit response-size limits before JSON parsing.

Provider errors, logs, and UI messages must not include provider response
bodies, request bodies containing secrets, credentials, URLs with embedded
secrets, or raw customer ticket content. Non-success responses are classified
by status code while their bodies are discarded.

## Ticket List Query Boundary

Core and feature code pass only the provider-neutral `TicketListQuery` contract
to provider plugins. The normalized query shape contains canonical filter,
`pageSize`, opaque cursor, sort, count, and grouping fields only. Raw provider
search strings, provider parameter names, endpoint paths, and provider-specific
cursor formats must not be accepted or forwarded by core/feature code.

Provider plugins own compilation from the provider-neutral query to upstream
API syntax. If a query asks for a capability the provider has not advertised,
or for a guarded expensive combination, the ticket service returns a
provider-neutral unavailable state before provider code is called.

## Ticket Metadata Mutations

The approved mutation surface includes state, priority, owner, group, tags,
related links, and subscription/following state. Provider-neutral code passes
canonical Resolvrr keys in `TicketMetadataMutationInput`; provider plugins map
those keys to raw provider values inside their own folders. Pending state
transitions may include a canonical `pendingUntil` timestamp as supporting data;
provider-specific fields such as Zammad `pending_time`, tag endpoint payloads,
link endpoint payloads, and mention payloads stay in the provider
implementation.

Successful writes are followed by a service-layer refresh check for the affected
ticket detail and list row. If the write succeeds but refresh fails, callers
receive `saved-refresh-failed` so UI can present a non-destructive warning.
Optimistic metadata updates are not part of this slice.

Providers must treat non-mutable terminal lifecycle records as a mutation
precondition. Zammad re-reads the selected ticket before any metadata,
secondary, internal-note, Reply, or Reply-all write and issues no write request
when the source is merged.

Metadata mutation and communication audit logs stay at the provider-neutral
service boundary and record only outcome metadata such as operation kind, field
names/counts, status, retryability, and safe provider metadata. Provider request
payloads, response bodies, provider-local ticket IDs, assignment IDs, link IDs,
tag values, note bodies, reply bodies, and customer content must remain out of
logs.

## Ticket Communication Mutations

The approved communication write surface covers internal notes and contextual
customer replies. Provider-neutral reply contracts carry source article ID,
intent, opaque context version, and reviewed To/Cc recipients in addition to
body and format. Provider plugins derive per-article availability/defaults and
map sends to provider-specific article payloads inside their own folders.
Provider message IDs, raw recipient fields, endpoints, and system-address rules
never cross the provider boundary.

Successful communication writes are followed by a service-layer refresh check
for the selected ticket detail/thread. If the write succeeds but refresh fails,
callers receive `saved-refresh-failed` so UI can present a non-destructive
warning and keep provider source-of-truth semantics. Optimistic rendering is
not used. Forwarded source attachments are revalidated and read only inside the
provider boundary with bounded binary responses.

Communication audit logs record only the communication kind, final status,
provider-neutral failure reason, retryability, and safe connection/provider
metadata. They must not record selected ticket IDs, provider article IDs,
recipient addresses, note bodies, reply bodies, provider request payloads, or
provider response bodies. `saved-refresh-failed` is logged as its own uncertain
send outcome, not as a failed provider write.

Provider implementations must not trust client-supplied baseline recipients.
Zammad reads active system addresses and derives each source article's Reply and
Reply all context using its native sender, Reply-To, From/To/Cc, and web/phone
fallback rules. At send it re-fetches the ticket, article, and address policy;
checks ownership, visibility, channel, intent, and context version; then strictly
normalizes the reviewed To/Cc set. User-added addresses remain allowed, including
warned system addresses. Failed revalidation produces no POST, while an
uncertain POST result is non-retryable and must be verified from refreshed
provider source.

Zammad forwarding is independent of reply derivation. Any public email article
may expose a provider-neutral forward context, including system-originated mail
whose From/To/Reply-To values are all managed addresses. The provider freshly
revalidates the ticket and exact source article, subject, recipients, context
version, and selected attachment IDs before creating one email article. The
forward payload intentionally omits `in_reply_to` and `references`; Zammad alone
performs outbound channel delivery.

## Ticket Read Observability

Provider read and write implementations should measure their own upstream
request and mapping phases through sanitized ticket-read timing events. Zammad
currently measures list request, detail metadata request, article/thread
request, metadata mutation current-ticket request, metadata mutation write
request, secondary tags request, secondary links request, secondary
subscription request, secondary group lookup request, assignable-user lookup
request, group lookup request, user-lookup request, and mapping/parsing phases.
If a provider requires additional upstream calls for future secondary data,
those calls must be orchestrated in the provider/read service layer and added as
explicit measured phases. Lookup lists are request-scoped reads; the app may
reuse them only through the existing active-session selected-ticket detail
cache. UI components must not introduce provider fetch fan-out.

## Zammad Boundary

Zammad ticket list, detail, thread DTO validation, endpoint construction,
metadata write payload construction, internal-note/customer-reply/customer-forward
article payload construction, customer reply recipient resolution, forward
source/attachment revalidation, and raw
state/priority/assignment/tag/link/subscription normalization live under
`src/providers/zammad`. Core, feature, UI, and provider-neutral tests consume
only canonical ticket values and provider capabilities. Zammad currently
advertises `ticket:list`,
`ticket:count`, `ticket:sort`, `ticket:group`, `ticket:group-count`,
`ticket:detail`, `ticket:links`, `ticket:subscription`,
`ticket:update-state`, `ticket:update-priority`, `ticket:update-owner`,
`ticket:update-group`, `ticket:update-tags`, `ticket:update-links`,
`ticket:update-link-relations`, `ticket:update-subscription`,
`ticket:add-internal-note`, `ticket:add-customer-reply`,
`ticket:forward-customer-email`,
`lookup:link-targets`, `lookup:assignable-users`, `lookup:groups`, and
`lookup:tags`.
Subscription fields still use the stable empty canonical shapes documented in
the ticket contract when their provider-neutral capabilities are not advertised.
Zammad global tag suggestions use the admin-only global tag list endpoint;
ticket tag reads/writes continue to use ticket-scope endpoints requiring
`ticket.agent` or `admin.tag`, and freeform tag editing remains available when
global suggestions are unavailable. Freeform tag application or creation may
still be denied by instance policy at mutation time; that surfaces through the
provider-safe metadata mutation error path.
Zammad-backed sorting is implemented through the provider's ticket search
endpoint with provider-neutral sort keys translated to Zammad sort fields.
Every normal Zammad ticket collection uses the search endpoint with a
provider-owned exclusion for the protected `merged` state, including otherwise
unfiltered lists. The same visibility rule applies to buckets, link targets,
related links, and notification ticket results before they cross the provider
boundary.
Zammad-backed total counts and state/priority grouped bucket counts use the
documented search `with_total_count=true` response and map only
provider-neutral `totalCount` and bucket metadata out of the provider layer.
Zammad still does not advertise full-text search, and owner/customer/group
grouping remains deferred until bucket cardinality and provider support are
designed.
Zammad-specific state-transition behavior also stays inside this provider
folder: the canonical `new` state is shown as the current value when applicable
but is omitted from the selectable state menu, and pending-state transitions
require a future pending date/time. The UI only receives canonical hidden state
keys, date-required state keys, and user-safe reasons.

For detail reads, Zammad recognizes its protected merged state, reads the
ticket history inside the provider, and maps the authoritative `merged_into`
target to a provider-neutral replacement. Raw history events and target fields
never leave `src/providers/zammad`. Missing or inaccessible destinations map to
a retired result instead of guessing.

Zammad reads request expanded/full payloads when available so provider-specific
user assets can be mapped to canonical participants. Display names such as
`firstname`/`lastname`, `fullname`, or `name` are preferred over email labels;
email remains secondary metadata or a fallback when no usable display name is
available.
