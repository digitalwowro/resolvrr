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

The first approved mutation surface is state and priority only. Provider-neutral
code passes canonical Resolvrr keys in `TicketMetadataMutationInput`; provider
plugins map those keys to raw provider values inside their own folders. Pending
state transitions may include a canonical `pendingUntil` timestamp as
supporting data; provider-specific fields such as Zammad `pending_time` stay in
the provider implementation.

Successful writes are followed by a service-layer refresh check for the affected
ticket detail and list row. If the write succeeds but refresh fails, callers
receive `saved-refresh-failed` so UI can present a non-destructive warning.
Optimistic metadata updates are not part of this slice.

## Ticket Read Observability

Provider read and write implementations should measure their own upstream
request and mapping phases through sanitized ticket-read timing events. Zammad
currently measures list request, detail metadata request, article/thread
request, metadata mutation current-ticket request, metadata mutation write
request, user-lookup request, and mapping/parsing phases. If a provider requires
additional upstream calls for future secondary data such as tags, links,
subscription, or lookup lists, those calls must be orchestrated in the
provider/read service layer and added as explicit measured phases. UI
components must not introduce provider fetch fan-out.

## Zammad Boundary

Zammad ticket list, detail, thread DTO validation, endpoint construction,
metadata write payload construction, and raw state/priority normalization live
under `src/providers/zammad`. Core, feature, UI, and provider-neutral tests
consume only canonical ticket values and provider capabilities. Zammad currently
advertises `ticket:list`, `ticket:count`, `ticket:sort`, `ticket:detail`,
`ticket:update-state`, and `ticket:update-priority`; unsupported links and
subscription data are returned as the required empty canonical shapes documented
in the ticket contract. Zammad-backed sorting is implemented through the
provider's ticket search endpoint with provider-neutral sort keys translated to
Zammad sort fields. Zammad-backed total counts use the documented search
`with_total_count=true` response and map only the provider-neutral `totalCount`
field out of the provider layer. Zammad still does not advertise grouping,
grouped count, or full-text search yet, so those requests are rejected by the
provider-neutral guardrail layer before Zammad list code is called.
Zammad-specific state-transition behavior also stays inside this provider
folder: the canonical `new` state is shown as the current value when applicable
but is omitted from the selectable state menu, and pending-state transitions
require a future pending date/time. The UI only receives canonical hidden state
keys, date-required state keys, and user-safe reasons.

Zammad reads request expanded/full payloads when available so provider-specific
user assets can be mapped to canonical participants. Display names such as
`firstname`/`lastname`, `fullname`, or `name` are preferred over email labels;
email remains secondary metadata or a fallback when no usable display name is
available.
