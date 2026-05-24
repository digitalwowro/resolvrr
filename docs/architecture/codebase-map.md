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
- `vitest.config.ts`: unit and component test configuration.
- `docker-compose.yml`: project-specific local Postgres service.
- `prisma.config.ts`: Prisma 7 CLI configuration and database URL loading.
- `next-env.d.ts`: Next-maintained TypeScript references.
- `public/brand`: static rendered brand assets for the app shell, such as the
  Resolvrr logo file when supplied.
- `public/brand/resolvrr-logo.svg`: supplied Resolvrr brand image rendered in
  the workspace header.

## Source Folders

- `src/app`: thin Next route and layout files. Product logic should move into
  feature, core, provider, data, or UI modules.
- `src/app/layout.tsx`: root document shell and metadata.
- `src/app/page.tsx`: auth-aware root redirect to `/login` or `/workspace`.
- `src/app/login/page.tsx`: minimal sign-in form wired to a server action.
- `src/app/register/page.tsx`: minimal registration form wired to a server
  action.
- `src/app/workspace/page.tsx`: protected authenticated workspace route that
  keeps auth guarding and route composition thin.
- `src/app/workspace/connections/page.tsx`: protected helpdesk workspace
  connection list route.
- `src/app/workspace/connections/new/page.tsx`: protected add-connection form
  route.
- `src/app/workspace/connections/[connectionId]/edit/page.tsx`: protected
  edit-connection form route that never receives stored credential payloads.
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
- `src/auth/service.ts`: registration, login, current-session, logout, and
  expired-session cleanup use cases.
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
- `src/data/helpdesk-connections-repository.ts`: Prisma-backed helpdesk
  connection repository and active connection preference persistence.
- `src/data/prisma.ts`: Prisma Client singleton with PostgreSQL driver adapter.
- `src/security`: security-sensitive helpers shared by server-side code.
- `src/security/encryption.ts`: AES-256-GCM secret envelope encryption.
- `src/security/base-url-validation.ts`: provider-neutral HTTPS and SSRF
  validation for user-provided helpdesk base URLs.
- `src/security/sanitize-html.ts`: provider HTML sanitization.
- `src/security/safe-log.ts`: helper for safe metadata-only logs.
- `src/providers`: provider registry and provider plugin implementations.
- `src/providers/available-providers.ts`: single documented provider assembly
  file allowed to import installed provider plugins directly before exporting
  the provider-neutral registry.
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
- `src/features/helpdesk-connections`: provider-neutral connection management
  feature.
- `src/features/helpdesk-connections/actions.ts`: server actions for connection
  create, update, validate, enable/disable, active selection, and local delete.
- `src/features/helpdesk-connections/repository.ts`: persistence interface and
  active-connection preference key for connection workflows.
- `src/features/helpdesk-connections/service.ts`: connection use cases for
  ownership, encrypted credential handling, SSRF validation, and provider
  validation.
- `src/features/helpdesk-connections/form-parsing.ts`: provider-neutral
  connection form parsing and blank credential preservation rules.
- `src/features/helpdesk-connections/provider-validation.ts`: connection
  validation helper that combines SSRF validation with provider validation.
- `src/features/helpdesk-connections/messages.ts`: user-safe connection action
  messages.
- `src/features/helpdesk-connections/index.ts`: helpdesk connection feature
  exports.
- `src/features/helpdesk-connections/components`: server-rendered connection
  list and form components.
- `src/features/helpdesk-connections/components/connection-page-shell.tsx`:
  shared page shell for protected connection management routes.
- `src/features/helpdesk-connections/components/connection-list.tsx`: local
  connection list with active, validate, enable/disable, edit, and delete forms.
- `src/features/helpdesk-connections/components/connection-form.tsx`: add/edit
  form that never echoes stored credentials to the browser.
- `src/features/saved-views/index.ts`: saved view feature boundary.
- `src/features/tickets/index.ts`: ticket workflow feature boundary.
- `src/features/settings/index.ts`: settings feature boundary.
- `src/features/workspace/index.ts`: workspace feature boundary. UI copy may say
  workspace, but persisted domain concepts remain helpdesk connections.
- `src/features/workspace/static-types.ts`: feature-local synthetic workspace
  UI fixture types, not core/provider/data models.
- `src/features/workspace/static-fixtures.ts`: synthetic saved views, profile
  menu rows, ticket tabs, ticket rows, and columns for static workspace review.
- `src/features/workspace/components/static-workspace.tsx`: client-side static
  workspace shell with local-only interaction state.
- `src/features/workspace/components/workspace-header.tsx`: compact workspace
  header with brand image hook, local search input, and compact profile menu.
- `src/features/workspace/components/workspace-controls.tsx`: static workspace
  controls for local saved view search, tab orientation, bulk action, refresh,
  select-all, and column visibility behavior.
- `src/features/workspace/components/ticket-tabs-panel.tsx`: horizontal or
  vertical open-ticket tab presentation, including the fixed vertical tab rail
  for synthetic tickets.
- `src/features/workspace/components/ticket-detail-placeholder.tsx`: static
  ticket detail composition for the title, thread, and sidebar visual review.
- `src/features/workspace/components/ticket-detail-sidebar.tsx`: static
  local-only ticket action sidebar controls for visual review.
- `src/features/workspace/components/ticket-reply-composer.tsx`: local-only
  inline reply composer for static ticket thread review.
- `src/features/workspace/components/ticket-thread.tsx`: static synthetic reply
  thread cards and local reply-mode state for ticket detail visual review.
- `src/features/workspace/components/ticket-table-cells.tsx`: feature-local
  state and priority cell renderers shared by ticket rows and group headers.
- `src/features/workspace/components/ticket-table-grouping.ts`: feature-local
  static grouping and row sorting helpers for the workspace ticket list.
- `src/features/workspace/components/ticket-table.tsx`: dense synthetic ticket
  table with optional feature-local group headers for the main workspace list.
- `src/features/workspace/components/ticket-table-grid.tsx`: feature-local grid
  table layout helpers for the workspace ticket list; not a shared primitive.
- `src/components/ui`: reusable UI primitives.
- `src/components/ui/button.tsx`: compact button primitive.
- `src/components/ui/checkbox.tsx`: labeled checkbox primitive.
- `src/components/ui/classnames.ts`: small class name composition helper.
- `src/components/ui/dropdown-navigation.ts`: shared dropdown option navigation
  helpers.
- `src/components/ui/dropdown-select.tsx`: non-searchable single-select
  dropdown primitive.
- `src/components/ui/dropdown-styles.ts`: shared dropdown trigger, menu,
  measurement-layer, and row class contracts.
- `src/components/ui/dropdown-types.ts`: shared dropdown option type.
- `src/components/ui/loading-state.tsx`: labeled compact loading state.
- `src/components/ui/menu-dropdown.tsx`: generic action menu primitive.
- `src/components/ui/menu-navigation.ts`: shared menu item navigation and
  typeahead helpers.
- `src/components/ui/profile-menu.tsx`: generic profile-style menu trigger and
  menu composition.
- `src/components/ui/searchable-dropdown.tsx`: searchable single-select
  dropdown primitive.
- `src/components/ui/spinner.tsx`: standard loading spinner primitive.
- `src/components/ui/status-badge.tsx`: compact state badge primitive.
- `src/components/ui/table.tsx`: shared table shell, header, row, and cell
  rhythm primitives.
- `src/components/ui/table-header-cell.tsx`: sortable and resizable table header
  affordance primitive.
- `src/components/ui/ticket-tab.tsx`: open-ticket tab primitive.
- `src/components/ui/toolbar-controls.tsx`: compact toolbar wrappers over
  button and dropdown primitives.
- `src/components/ui/tooltip.tsx`: custom non-interactive tooltip primitive.
- `src/components/ui/index.ts`: UI primitive exports.
- `src/components/ui/use-outside-click.ts`: shared outside-click close helper.
- `src/components/ui/use-table-sort.ts`: shared sortable table state hook; row
  comparison stays in the owning feature.
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
- `tests/unit/auth-service.test.ts`: verifies registration, login, session,
  logout, and expired-session cleanup use cases.
- `tests/unit/auth-validation.test.ts`: verifies email normalization and
  password input validation.
- `tests/unit/base-url-validation.test.ts`: verifies helpdesk base URL and SSRF
  validation rules.
- `tests/unit/encryption.test.ts`: verifies secret envelope encryption.
- `tests/unit/helpdesk-connections-service.test.ts`: verifies connection
  ownership, credential encryption, active preference, and validation behavior.
- `tests/unit/provider-boundary.test.ts`: verifies direct provider-specific
  imports stay out of core, UI, and feature code.
- `tests/unit/provider-registry.test.ts`: verifies provider registry lookup and
  duplicate-key protection.
- `tests/unit/sanitize-html.test.ts`: verifies provider HTML sanitization.
- `tests/unit/session-cookie.test.ts`: verifies secure session cookie options.
- `tests/components`: component interaction tests for shared UI primitives.
- `tests/components/dropdowns.test.tsx`: verifies searchable and non-searchable
  dropdown keyboard and close behavior.
- `tests/components/menu-tooltip.test.tsx`: verifies menu, profile menu, and
  tooltip keyboard behavior.
- `tests/components/primitives-state.test.tsx`: verifies basic primitive states.
- `tests/components/table.test.tsx`: verifies shared table wrappers and sortable
  table state.
- `tests/components/table-ticket.test.tsx`: verifies ticket tab and table header
  callbacks.
- `tests/features`: feature-level component tests.
- `tests/features/static-workspace.test.tsx`: verifies local-only static
  workspace interactions and render states.
- `tests/providers`: provider-specific tests.
- `tests/providers/zammad/credentials.test.ts`: verifies provider-specific Basic
  Auth credential helpers.
- `tests/providers/zammad/validation.test.ts`: verifies provider-specific Basic
  Auth validation request behavior.
- `tests/setup.ts`: component test cleanup and DOM matcher setup.
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
