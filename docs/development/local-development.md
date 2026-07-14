# Local Development

The local app boundary is `/home/resolvrr/resolvrr`.

## Common Commands

- Install dependencies: `npm install`
- Start Postgres: `docker compose -p resolvrr up -d resolvrr-postgres`
- Validate Docker Compose: `npm run db:compose:config`
- Generate Prisma Client: `npm run prisma:generate`
- Create/apply a development migration: `npm run prisma:migrate -- --name init`
- Start the app directly: `npm run dev`
- Clear local caches: `npm run cache:clear`
- Run checks: `npm run lint`, `npm run typecheck`, `npm run size:check`,
  `npm test`, `npm run build`, `npm audit`

Merged-ticket changes require focused coverage for provider query exclusion,
history/replacement chains, cache source invalidation, zero-write mutation
preflight, notification/link visibility, persisted-tab cleanup, URL/tab
replacement, and the read-only tombstone. Live characterization must use the
existing provider-safe read boundary and must not mutate production tickets.
Browser automation and screenshots are not part of routine verification unless
explicitly requested.

## Local Services

The app listens on `0.0.0.0:3005`. Open the app through
`https://resolvrr.dwow.dev`.

Postgres runs through Docker Compose:

- Compose project: `resolvrr`
- Service: `resolvrr-postgres`
- Container: `resolvrr-postgres-dev`
- Host port: `55432`
