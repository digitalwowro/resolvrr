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
  provider credentials and sensitive cache payloads.
- `SESSION_SECRET`: server-side session secret material.
- `AI_PROVIDER`: optional read-only AI protocol. Use `disabled`,
  `openai-compatible`, or `anthropic-compatible`.
- `AI_OPENAI_BASE_URL`, `AI_OPENAI_API_KEY`, `AI_OPENAI_MODEL`: server-side
  OpenAI-compatible Chat Completions settings. Required only when
  `AI_PROVIDER=openai-compatible`.
- `AI_ANTHROPIC_BASE_URL`, `AI_ANTHROPIC_API_KEY`, `AI_ANTHROPIC_MODEL`:
  server-side Anthropic-compatible Messages settings. Required only when
  `AI_PROVIDER=anthropic-compatible`.

Do not expose provider credentials, passwords, tokens, cookies, customer ticket
content, AI credentials, prompts, generated summaries, or raw provider payloads
to client-readable storage.
