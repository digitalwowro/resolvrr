# Environment Configuration

Runtime configuration is part of the application interface. Keep the ignored
root `.env`, `docs/deploy/.env.example`, and `src/config/env.ts` in sync.

## Local Development Defaults

- `APP_BASE_URL`: browser-facing origin, `https://resolvrr.dwow.dev`.
- `HOSTNAME`: browser-facing development hostname, `resolvrr.dwow.dev`.
- `PORT`: app port, `3005`.
- `ALLOWED_DEV_ORIGINS`: comma-separated hostnames accepted by Next dev.
- `DATABASE_URL`: PostgreSQL connection URL using host port `55432`.
- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`: Docker Postgres settings.
- `APP_ENCRYPTION_KEY`: base64-encoded 32-byte key for server-side encrypted
  provider credentials, workspace/user AI credentials, and sensitive cache
  payloads, including AI prompt defaults and user prompt overrides.
- `SESSION_SECRET`: server-side session secret material.

Read-only AI provider credentials are not configured through environment
variables. Admins configure the active workspace from `Avatar -> Settings ->
AI Settings`. A workspace can disable AI, use an encrypted workspace key, or
require each user to save an encrypted per-workspace key. OpenAI-compatible and
Anthropic-compatible provider settings require an HTTPS base URL, model, and API
key; saves run a live provider validation request before persistence.

Prompt Center and future My Style data use the same application encryption
posture as other AI settings. `APP_ENCRYPTION_KEY` must remain stable across
deployments because it protects helpdesk credentials, AI keys, prompt defaults,
personal prompt overrides, generated-summary cache payloads, and future
personal style guidance.

Do not expose provider credentials, passwords, tokens, cookies, customer ticket
content, AI credentials, prompts, generated summaries, or raw provider payloads
to client-readable storage.
