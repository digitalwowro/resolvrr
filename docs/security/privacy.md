# Security And Privacy Model

Resolvrr stores local settings and encrypted provider connection credentials.
The connected helpdesk provider remains the source of truth for tickets and
conversation content.

## Credentials

- Resolvrr users authenticate with email/password and server-side SQL sessions.
- Passwords are hashed with Argon2id.
- Browser storage receives only the http-only `resolvrr_session` cookie.
- SQL stores only a hash of the session token.
- Helpdesk credentials are stored server-side, encrypted at rest, and scoped to
  the Resolvrr user and helpdesk connection.
- Provider credentials must never be stored in cookies, localStorage,
  sessionStorage, or client-readable state.

## Provider Data

- Cache only the provider data needed for list/detail performance.
- Do not cache full provider responses by default.
- If sensitive ticket/thread content must be cached, store sanitized normalized
  content and encrypt sensitive body fields at rest.
- The cache and freshness contract lives in
  `docs/architecture/cache-and-privacy-contract.md`. Durable provider cache,
  generated output cache, background sync, and webhooks must not be added until
  their scope follows that contract.
- Logs may include safe metadata such as provider key, connection id,
  capability, communication kind, mutation field names, field counts, status,
  retryability, and timing. Logs must not include credentials, tokens,
  passwords, cookies, raw provider payloads, provider response bodies, mutation
  request bodies, provider-local ticket or linked-ticket IDs, article IDs,
  recipient addresses, internal note bodies, customer reply bodies, or customer
  message bodies.

## AI Prompt And Output Data

- AI features are optional and must use sanitized provider-neutral source data.
- Read-only selected-ticket summaries reload ticket detail on the server, then
  use selected-ticket metadata and sanitized thread text only under the
  cache/freshness rules in the architecture contract.
- Prompts, generated summaries, draft suggestions, and generated replies must
  not be logged.
- AI telemetry may include only operation, phase, provider protocol family,
  duration, status, unavailable reason, and retryability. It must not include
  provider request bodies, provider response bodies, provider credentials, model
  names, ticket IDs, article IDs, customer names, email addresses, prompts,
  generated summaries, or ticket/thread content.
- Generated output cache is separate from provider data cache and is not part of
  the read-only summary phase.
- Customer-visible communication still happens only through the selected
  helpdesk provider after explicit user review and submit.
