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
- AI provider API keys are stored server-side, encrypted at rest, and scoped to
  either the active workspace default or a user plus workspace. They are managed
  from `Avatar -> Settings -> AI Settings`.
- Provider and AI credentials must never be stored in cookies, localStorage,
  sessionStorage, or client-readable state.

## Provider Data

- Cache only the provider data needed for list/detail performance.
- Do not cache full provider responses by default.
- If sensitive ticket/thread content must be cached, store sanitized normalized
  content and encrypt sensitive body fields at rest.
- The current durable provider cache stores selected-ticket detail/thread
  snapshots as encrypted normalized payloads scoped by user, active helpdesk
  connection, provider ticket identity, and source version. It does not cache
  raw provider payloads, provider request/response bodies, or background sync
  data.
- The cache and freshness contract lives in
  `docs/architecture/cache-and-privacy-contract.md`. Durable provider cache,
  generated output cache, background sync, and webhooks must follow that
  contract.
- Logs may include safe metadata such as provider key, connection id,
  capability, communication kind, mutation field names, field counts, status,
  retryability, and timing. Logs must not include credentials, tokens,
  passwords, cookies, raw provider payloads, provider response bodies, mutation
  request bodies, provider-local ticket or linked-ticket IDs, article IDs,
  recipient addresses, internal note bodies, customer reply bodies, or customer
  message bodies.

## AI Prompt And Output Data

- AI features are optional and must use sanitized provider-neutral source data.
- AI runtime configuration is resolved from the active workspace policy:
  disabled, admin-managed workspace key, or user-provided per-workspace key.
  There is no app-wide AI key in v1.
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
- Generated selected-ticket summaries may be cached server-side as encrypted
  output scoped by user, active helpdesk connection, selected ticket,
  source fingerprint/freshness, prompt version, sanitization version, provider
  protocol, and model fingerprint. Prompt text, raw provider payloads, model
  names, and generated summaries must not be logged.
- Customer-visible communication still happens only through the selected
  helpdesk provider after explicit user review and submit.
