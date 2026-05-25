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
- Logs may include safe metadata such as provider key, connection id, ticket id,
  capability, status, and timing. Logs must not include credentials, tokens,
  passwords, cookies, raw provider payloads, provider response bodies, mutation
  request bodies, or customer message bodies.
