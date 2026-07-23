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

The provider-neutral Workspace owns the provider key and canonical shared URL.
Each workspace member owns a separate HelpdeskConnection and encrypted
credential. Provider validation returns only a normalized external identity ID
and display label. Zammad derives that identity from `/api/v1/users/me` inside
`src/providers/zammad/**`; raw fields never cross the provider boundary.

Connection lookup is always constrained by the signed-in user before a
credential can be returned or decrypted. Workspace membership, ADMIN role,
global administration, and workspace ownership are insufficient. A missing
personal connection returns `personal-connection-required` before cache or
provider access. Within one workspace, one provider identity may be linked to
only one Resolvrr user; changing identities requires explicit disconnect and
reconnect.

Changing the shared provider URL is destructive: all personal credentials and
validated identities are removed, identity versions rotate, provider-derived
caches are cleared, and every member must reconnect. Ownership transfer never
moves a personal connection.

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

Zammad list and search reads request `full=true`. Live contract
characterization confirmed that the full payload supplies rich user assets and
the requested total count, but can omit group, state, and priority assets.
Provider-owned parallel lookup reads fill only those missing named dictionaries.
Adding `expand=true` did not restore the omitted group assets on the connected
instance, so list/search avoids that redundant payload flag. This list-specific
choice does not alter detail/thread read behavior.

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
provider boundary with bounded binary responses. Providers expose only their
user-visible attachment set; body alternatives and referenced inline resources
remain provider-private. The optional `ticket:attachments` read capability may
serve one freshly revalidated visible file through the authenticated
provider-neutral download route. Implementations must verify ticket/article
ownership, visible classification, declared size, received size, filename, and
content type before returning bounded bytes. The optional `ticket:inline-images`
read capability may
serve an exact referenced raster image through the authenticated provider-neutral
media route. Implementations must freshly verify ticket/article ownership,
provider inline classification, MIME allowlisting, and size bounds before reading
bytes; unclassified provider attachment reads are not permitted.

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

Reply, Reply all, and Forward may include a provider-derived public conversation
transcript. The provider versions all eligible public customer/agent email, web,
and phone articles during detail reads. Every contextual article action receives
a `through-source` context containing only that article and earlier messages;
sticky-footer actions receive a `current` context containing everything through
now. At submit the provider re-reads the complete set, rebuilds the reviewed
scope, rejects a stale history version, removes nested quotes and signatures
with the shared provider-neutral content trimmer, preserves bounded referenced
inline images, lists rather than reattaches historical files, and appends the
newest-first read-only transcript after the current outbound signature.
Internal notes, system events, and private articles never enter the transcript.
Mention conversion applies only to the newly authored body.

Inbound Zammad article mapping converts explicit signature markers, explicit
signature containers, and strictly valid positive-integer learned signature
positions into typed provider-neutral hints over the final sanitized HTML.
Raw classes, attributes, learned-position fields, and provider conditionals stay
inside `src/providers/zammad/**`; no synthetic boundary element is injected into
article HTML, so typed hints remain the single provider signal. These hints are
deliberately advisory: provider
markup can be over-broad and may enclose authored message content. The shared core
detector validates each hint, may refine an over-broad container to a safer inner
delimiter or terminal structural block, and fails open when no safe boundary
exists. A parser-based structural pass supplies independent language-neutral
evidence for compact contact cards, semantic containers, sibling clusters, and
nested envelopes. The workspace disclosure and outbound conversation-history
assembly consume the same validated split; only the workspace applies an
additional presentation threshold before showing a disclosure. A redacted golden
corpus covers the known provider shapes and ambiguous non-signature content. A
plain-text `>` line collapses only when it begins a terminal quoted suffix, so it
cannot hide later authored text.

Zammad forwarding is independent of reply derivation. Any public email article
may expose a provider-neutral forward context, including system-originated mail
whose From/To/Reply-To values are all managed addresses. The provider freshly
revalidates the ticket and exact source article, subject, recipients, context
version, reviewed conversation-history scope/version, and selected source
attachment IDs before creating one email article. Zammad
attachment visibility mirrors its `attachmentsWithoutInline` behavior: exact
raw CID or transformed inline-URL body references are excluded, while filenames,
image MIME types, and inline disposition alone never hide a file. Hidden inline
images may be read internally to preserve an included original, but cannot be
selected as attachments. The forward payload intentionally omits `in_reply_to`
and `references`; Zammad alone performs outbound channel delivery.

Outbound signatures use a provider-neutral reviewed signature context. A workspace
admin selects no signature, a Resolvrr template, or provider-managed rendering.
For provider-managed rendering, Zammad alone resolves the current group/user
signature. The provider adapter uses the form-updater signature field on current
Zammad versions and the dedicated ticket-signature query on Zammad 6.5 when that
field is absent. Raw signature IDs, GraphQL fields, endpoints, and attachment
paths remain in the provider. Signature images are either bounded,
MIME-checked provider reads or bounded provider-rendered image data, and are
inlined only into the reviewed article body. At submit, Resolvrr resolves the
signature again and rejects a stale context before posting the article to
Zammad. Resolvrr never delivers email; Zammad remains solely responsible for
delivery.

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

## Ticket Tab Import

`ticket-tabs:import` is an optional, read-only provider capability. Core exposes
only an ordered set of ticket external IDs.
Provider task IDs, callback names, application names, parameter fields,
endpoint paths, and non-ticket task types never cross the plugin boundary.

The Zammad implementation pins and validates the undocumented REST taskbar
response only when the user explicitly presses `Sync tabs`. It performs exactly
one GET, accepts desktop ticket tasks, ignores other applications and task
types, sorts by provider priority, and deduplicates ticket IDs. It implements no
taskbar POST, PUT, or DELETE operation. Connection validation does not probe the
taskbar endpoint, and ordinary workspace activity never calls it.

The server action requires ownership of the personal helpdesk connection and
an exact identity-version match before decrypting credentials or calling the
provider. Every imported ticket is hydrated through that same explicit
connection, workspace, and identity version; hydration never falls back to the
user's subsequently active workspace. An incompatible contract disables only
that import attempt. Ticket-specific unavailable results are skipped, while an
import-wide connection, credential, rate-limit, or temporary provider failure
stops further hydration after the current bounded batch and is reported
visibly. Errors are not retried automatically. Safe telemetry records only
status, duration, retryability, and counts—never ticket IDs, titles,
credentials, or raw taskbar payloads.

Personal composer drafts are deliberately not part of the provider contract.
Live characterization disproved the assumption that the REST taskbar record
reliably exposes the currently edited article body and recipients. Resolvrr
therefore neither reads nor writes provider draft state and advertises no
personal-draft capability. Drafts remain local to the identity-scoped browser
recovery store until Update submits the final reviewed communication through
the normal ticket mutation contract. The deferred investigation and acceptance
gate are recorded in
`docs/architecture/zammad-personal-draft-sync-deferred.md`.

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
`lookup:link-targets`, `lookup:assignable-users`, `lookup:groups`,
`lookup:tags`, `lookup:mentionable-users`, and `ticket-tabs:import`.
Zammad also advertises `search:full-text` for permission-scoped global ticket
search.
Assignable-owner lookup is contextual: core supplies only provider-neutral
group and optional user external IDs. Zammad maps that intent to
`ticket.agent` users with `full` access to any requested group, paginates the
provider search rather than truncating at 50 records, and repeats the same
check against fresh ticket state before an owner/group mutation. Raw Zammad
access names and query parameters stay provider-owned.
Zammad may mask `group_ids` in otherwise valid user-search results, so the
provider treats the server-side full-access search constraint as authoritative
instead of incorrectly post-filtering on optional response associations.
Mention lookup is a separate contextual capability. Zammad resolves only active
agents with read access to the staged ticket group. Resolvrr keeps mention
tokens provider-neutral until the final article write; Zammad then validates the
native article mention, creates the notification, and subscribes the mentioned
agent. Resolvrr does not call a second mention or subscription mutation.
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
Relationship display fields are the exception: Zammad's `owner_id`,
`customer_id`, and `group_id` order opaque IDs rather than visible labels, so
the provider rejects those sort keys. The workspace retrieves the complete
filtered result without a relationship sort and applies provider-neutral
display-label ordering before paginating the visible in-memory window.
Every normal Zammad ticket collection uses the search endpoint with a
provider-owned exclusion for the protected `merged` state, including otherwise
unfiltered lists. The same visibility rule applies to buckets, link targets,
related links, and notification ticket results before they cross the provider
boundary.
Notification enrichment accepts both Zammad's expanded asset envelope and its
validated direct ticket-object response. Ticket references are resolved
independently: an individually deleted or inaccessible ticket is omitted
without suppressing valid notifications, while authentication, transport, and
schema failures still fail the notification read instead of producing a
misleading empty list.
Zammad-backed total counts and state/priority grouped bucket counts use the
documented search `with_total_count=true` response and map only
provider-neutral `totalCount` and bucket metadata out of the provider layer.
Full-text search preserves Zammad's advanced search syntax inside the provider,
wraps the requested expression, and adds the same immutable merged-state
exclusion used by normal collections. Invalid Zammad search responses map to a
provider-neutral, non-retryable invalid-query result. Owner/customer/group
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
