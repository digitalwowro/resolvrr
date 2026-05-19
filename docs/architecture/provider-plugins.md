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
- API clients and request construction.
- Raw response DTOs and canonical value mapping.
- Query/filter compilation.
- Provider-specific pagination, rate limits, and failure classification.
- Provider-specific tests and fixtures.

## Registration Rule

Core modules consume `HelpdeskProviderPlugin` through the registry contract. The
application composition layer supplies plugin instances to the registry. Core UI,
domain, and use-case files must not import provider plugin internals.
