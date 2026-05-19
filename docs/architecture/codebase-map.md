# Codebase Map

This map records the role of created folders and important files. Update it when
architecture folders or important files are added, moved, renamed, or removed.

## Root Files

- `.gitignore`: keeps local secrets, dependencies, build output, generated
  clients, logs, private memory, and editor files out of the app repo.
- `package.json`: npm scripts and pinned application dependencies.
- `package-lock.json`: npm dependency lockfile, created by `npm install`.
- `tsconfig.json`: strict TypeScript configuration and `@/*` source alias.
- `next.config.ts`: Next configuration, including browser-facing dev origin
  handling.
- `eslint.config.mjs`: flat ESLint configuration for TypeScript and Next.
- `postcss.config.mjs`: Tailwind CSS PostCSS integration.
- `vitest.config.ts`: unit test configuration.
- `docker-compose.yml`: project-specific local Postgres service.
- `prisma.config.ts`: Prisma 7 CLI configuration and database URL loading.
- `next-env.d.ts`: Next-maintained TypeScript references.

## Source Folders

- `src/app`: thin Next route and layout files. Product logic should move into
  feature, core, provider, data, or UI modules.
- `src/app/layout.tsx`: root document shell and metadata.
- `src/app/page.tsx`: auth-aware root redirect to `/login` or `/workspace`.
- `src/app/login/page.tsx`: minimal sign-in form wired to a server action.
- `src/app/register/page.tsx`: minimal registration form wired to a server
  action.
- `src/app/workspace/page.tsx`: protected authenticated placeholder route.
- `src/app/globals.css`: global Tailwind import and base document styles.
- `src/core`: provider-neutral domain contracts and canonical values.
- `src/core/tickets.ts`: canonical ticket states, priorities, list, detail,
  thread, link, subscription, and update types.
- `src/core/saved-views.ts`: provider-neutral saved view filters and metadata.
- `src/core/helpdesk-connections.ts`: explicit helpdesk connection domain types.
- `src/core/providers.ts`: provider plugin contract, capability names, provider
  errors, and provider operation types.
- `src/auth`: Resolvrr-native authentication helpers.
- `src/auth/current-user.ts`: server-only current-user lookup and protected route
  guard.
- `src/auth/password.ts`: Argon2id password hash and verify functions.
- `src/auth/repository.ts`: auth persistence interface used by service logic.
- `src/auth/service.ts`: registration, login, current-session, and logout use
  cases.
- `src/auth/session.ts`: raw session token generation, hashing, and expiry
  helpers.
- `src/auth/session-cookie.ts`: secure session cookie options.
- `src/auth/types.ts`: auth user, result, and session types.
- `src/auth/validation.ts`: email/password input parsing and normalization.
- `src/config`: typed runtime configuration.
- `src/config/env.ts`: Zod validation for required app, database, encryption,
  session, and dev-origin variables.
- `src/data`: server-only database access boundaries.
- `src/data/auth-repository.ts`: Prisma-backed auth repository.
- `src/data/prisma.ts`: Prisma Client singleton with PostgreSQL driver adapter.
- `src/security`: security-sensitive helpers shared by server-side code.
- `src/security/encryption.ts`: AES-256-GCM secret envelope encryption.
- `src/security/sanitize-html.ts`: provider HTML sanitization.
- `src/security/safe-log.ts`: helper for safe metadata-only logs.
- `src/providers`: provider registry and provider plugin implementations.
- `src/providers/registry.ts`: provider-neutral registry factory.
- `src/providers/index.ts`: registry exports.
- `src/providers/zammad`: first provider plugin implementation; provider-specific
  details stay in this folder and provider-specific tests.
- `src/providers/zammad/credentials.ts`: provider-specific Basic Auth credential
  parsing and header construction.
- `src/providers/zammad/errors.ts`: provider HTTP status classification.
- `src/providers/zammad/mapping.ts`: provider raw value to canonical value
  mapping.
- `src/providers/zammad/plugin.ts`: provider plugin object and connection
  validation boundary.
- `src/providers/zammad/index.ts`: provider plugin export.
- `src/features`: product feature boundaries that compose core contracts into
  workflows.
- `src/features/auth`: auth server actions and auth form messages.
- `src/features/auth/actions.ts`: login, register, and logout server actions.
- `src/features/auth/messages.ts`: auth form error message helpers.
- `src/features/auth/index.ts`: auth feature exports.
- `src/features/helpdesk-connections/index.ts`: helpdesk connection feature
  boundary.
- `src/features/saved-views/index.ts`: saved view feature boundary.
- `src/features/tickets/index.ts`: ticket workflow feature boundary.
- `src/features/settings/index.ts`: settings feature boundary.
- `src/features/workspace/index.ts`: workspace feature boundary. UI copy may say
  workspace, but persisted domain concepts remain helpdesk connections.
- `src/components/ui`: reusable UI primitives.
- `src/components/ui/button.tsx`: compact button primitive.
- `src/components/ui/spinner.tsx`: standard loading spinner primitive.
- `src/components/ui/index.ts`: UI primitive exports.
- `src/generated`: ignored Prisma Client output generated by `prisma generate`.

## Data, Scripts, Tests, And Docs

- `prisma/schema.prisma`: provider-neutral SQL schema.
- `prisma/migrations`: tracked database migrations created from the provider-
  neutral Prisma schema.
- `prisma/migrations/20260519062146_init/migration.sql`: initial SQL schema
  migration for users, sessions, helpdesk connections, credentials, saved views,
  provider cache, preferences, mutation logs, and app policy storage.
- `scripts/cache-clear.mjs`: clears local Next, TypeScript, and test caches and
  can optionally stop/start a user service.
- `scripts/check-docs.mjs`: checks required public docs exist and avoids
  disallowed process-origin wording.
- `tests/unit`: unit tests for domain, provider registry, and security helpers.
- `tests/unit/auth-service.test.ts`: verifies registration, login, session, and
  logout use cases.
- `tests/unit/auth-validation.test.ts`: verifies email normalization and
  password input validation.
- `tests/unit/encryption.test.ts`: verifies secret envelope encryption.
- `tests/unit/provider-registry.test.ts`: verifies provider registry lookup and
  duplicate-key protection.
- `tests/unit/sanitize-html.test.ts`: verifies provider HTML sanitization.
- `tests/unit/session-cookie.test.ts`: verifies secure session cookie options.
- `tests/providers`: provider-specific tests.
- `tests/providers/zammad/credentials.test.ts`: verifies provider-specific Basic
  Auth credential helpers.
- `docs/architecture`: public architecture and boundary docs.
- `docs/architecture/overview.md`: core product and architecture boundaries.
- `docs/architecture/provider-plugins.md`: provider plugin ownership and
  registration rules.
- `docs/architecture/codebase-map.md`: this file-role map.
- `docs/deploy`: environment and deployment docs, including `.env.example`.
- `docs/deploy/.env.example`: committed environment template.
- `docs/deploy/environment.md`: environment variable purpose and handling.
- `docs/deploy/systemd/resolvrr-dev.service.example`: user-level dev service
  template.
- `docs/development`: local development workflow docs.
- `docs/development/local-development.md`: development commands, service names,
  and local boundaries.
- `docs/operations`: service, cache, and operational command docs.
- `docs/operations/dev-service.md`: user-level dev service operations.
- `docs/operations/cache-clear.md`: cache-clear script usage.
- `docs/security`: security and privacy model docs.
- `docs/security/privacy.md`: credential, provider data, cache, and logging
  privacy rules.
- `docs/ui`: UI contract and primitive docs.
- `docs/ui/primitives.md`: reusable UI primitive expectations.
- `docs/ui/workspace-ui-contract.md`: approved workspace layout and interaction
  contract.
- `docs/features`: user-facing feature behavior docs.
- `docs/features/auth.md`: authentication behavior and security notes.
- `docs/features/foundation.md`: first foundation feature set and exclusions.
