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

## Ticket Read Security

Provider-backed ticket reads must use the provider-safe JSON request helper in
`src/security/provider-http.ts`. Reads must keep the same SSRF properties as
connection validation:

- HTTPS only.
- DNS resolution checked against the validated public address set.
- Request lookup pinned to the selected validated address.
- Fallback only across validated public addresses.
- No automatic redirects.
- Abort-signal timeout support.
- Explicit response-size limits before JSON parsing.

Provider read errors, logs, and UI messages must not include provider response
bodies, credentials, URLs with embedded secrets, or raw customer ticket content.
Non-success responses are classified by status code while their bodies are
discarded.

## Ticket Read Observability

Provider read implementations should measure their own upstream request and
mapping phases through sanitized ticket-read timing events. Zammad currently
measures list request, detail metadata request, article/thread request,
user-lookup request, and mapping/parsing phases. If a provider requires
additional upstream calls for future secondary data such as tags, links,
subscription, or lookup lists, those calls must be orchestrated in the
provider/read service layer and added as explicit measured phases. UI
components must not introduce provider fetch fan-out.

## Zammad Boundary

Zammad ticket list, detail, thread DTO validation, endpoint construction, and
raw state/priority normalization live under `src/providers/zammad`. Core,
feature, UI, and provider-neutral tests consume only canonical ticket values and
provider capabilities. Zammad currently advertises only `ticket:list` and
`ticket:detail`; unsupported links and subscription data are returned as the
required empty canonical shapes documented in the ticket read contract.

Zammad reads request expanded/full payloads when available so provider-specific
user assets can be mapped to canonical participants. Display names such as
`firstname`/`lastname`, `fullname`, or `name` are preferred over email labels;
email remains secondary metadata or a fallback when no usable display name is
available.
