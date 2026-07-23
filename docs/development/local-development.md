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
  `npm test`, `npm run build`
- Audit dependency changes: `npm audit --audit-level=moderate`

Merged-ticket changes require focused coverage for provider query exclusion,
history/replacement chains, cache source invalidation, zero-write mutation
preflight, notification/link visibility, persisted-tab cleanup, URL/tab
replacement, and the read-only tombstone. Live characterization must use the
existing provider-safe read boundary and must not mutate production tickets.
Browser automation and screenshots are not part of routine verification unless
explicitly requested.

## Optional Browser Verification

Playwright is exact-pinned as development-only tooling and is never part of the
default test, build, merge, or security workflow. Run it only when the user
explicitly requests browser or visual verification.

- Capture a local authenticated state on a headless SSH host by supplying the
  Resolvrr credentials only as temporary environment variables to
  `npm run playwright:auth`. The resulting
  `playwright/.auth/resolvrr.json` is gitignored and must never be committed or
  shared.
- Run explicitly authored Chromium checks: `npm run test:e2e`.
- Override the default origin when needed:
  `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3005 npm run test:e2e`.

Playwright files use `tests/e2e/*.pw.ts` so Vitest does not collect them.
Chromium runs serially to avoid concurrent writes against a shared development
helpdesk. Tests and audits must avoid live mutations unless the user explicitly
authorizes the exact operation.

## Local Services

The app listens on `0.0.0.0:3005`. Open the app through
`https://resolvrr.dwow.dev`.

Postgres runs through Docker Compose:

- Compose project: `resolvrr`
- Service: `resolvrr-postgres`
- Container: `resolvrr-postgres-dev`
- Host port: `55432`
