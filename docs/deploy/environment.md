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

Do not expose provider credentials, passwords, tokens, cookies, customer ticket
content, or raw provider payloads to client-readable storage.
