# Provider Plugin Boundary

Provider plugins adapt external helpdesk systems to the Resolvrr contract. Core
code should not know provider API routes, raw field names, query syntax, or
credential details.

## Core Owns

- Provider-neutral ticket, saved view, connection, and error contracts.
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
credentials. Validation requests must avoid automatic redirects so credentials
are not sent to an unvalidated redirect target.
