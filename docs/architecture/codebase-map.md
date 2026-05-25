# Codebase Map

This map records the role of created folders and important files. Update it when
architecture folders or important files are added, moved, renamed, or removed.

## Root Files

- `.github/dependabot.yml`: Dependabot update configuration for npm packages
  and GitHub Actions.
- `.github/workflows/ci.yml`: GitHub Actions workflow for normal verification
  CI on pull requests and pushes to `main`.
- `.github/workflows/codeql.yml`: GitHub CodeQL workflow for JavaScript and
  TypeScript analysis on main, pull requests to main, and a weekly schedule.
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
  composes the active helpdesk connection ticket read path and controlled
  state/priority mutation action into the real workspace.
- `src/app/workspace/connections/page.tsx`: protected helpdesk workspace
  connection list route.
- `src/app/workspace/connections/new/page.tsx`: protected add-connection form
  route.
- `src/app/workspace/connections/[connectionId]/edit/page.tsx`: protected
  edit-connection form route that never receives stored credential payloads.
- `src/app/globals.css`: global Tailwind import, base document styles, and
  default plain-anchor color.
- `src/core`: provider-neutral domain contracts and canonical values.
- `src/core/tickets.ts`: canonical ticket state and priority definitions plus
  provider-neutral ticket, thread, article, link, subscription, and
  state/priority metadata mutation types.
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
- `src/security/provider-http.ts`: SSRF-safe provider HTTPS request helper that
  binds requests to the revalidated address set and falls back only across
  validated public addresses; also exposes size-limited JSON request handling
  for provider ticket reads and controlled metadata writes.
- `src/security/sanitize-html.ts`: provider HTML sanitization that preserves
  safe rich-text article structure such as links, lists, headings, tables, and
  inline emphasis while dropping scripts and unsafe attributes.
- `src/security/safe-log.ts`: helper for safe metadata-only logs.
- `src/telemetry/ticket-read-timing.ts`: sanitized ticket timing logger used by
  provider-backed list/detail orchestration, controlled metadata mutations, and
  provider request/mapping phases.
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
- `src/providers/zammad/client.ts`: Zammad read/write client wrapper around the
  provider-safe JSON request helper.
- `src/providers/zammad/errors.ts`: provider HTTP status classification.
- `src/providers/zammad/mapping.ts`: provider raw value to canonical ticket,
  article, attachment, state, and priority mapping.
- `src/providers/zammad/mutation-policy.ts`: Zammad-only state mutation
  availability rules, exposed to core/UI as canonical hidden state keys and
  pending-date requirements.
- `src/providers/zammad/mutations.ts`: Zammad-only state/priority metadata
  write payload mapping, pending-time payload construction, state-transition
  guard, and endpoint call implementation.
- `src/providers/zammad/participants.ts`: Zammad user/participant display-name,
  email fallback, recipient, and expanded asset mapping helpers.
- `src/providers/zammad/plugin.ts`: provider plugin object, capabilities, and
  connection validation boundary.
- `src/providers/zammad/schemas.ts`: Zammad raw ticket, article, expanded asset,
  and user DTO schemas.
- `src/providers/zammad/tickets.ts`: Zammad ticket list/detail endpoint reads,
  read-phase timing, and canonical response assembly.
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
  validation helper that combines SSRF validation with provider validation,
  safe failure messages, and metadata-only diagnostics.
- `src/features/helpdesk-connections/messages.ts`: user-safe connection action
  messages.
- `src/features/helpdesk-connections/index.ts`: helpdesk connection feature
  exports.
- `src/features/helpdesk-connections/components`: server-rendered connection
  list and form components.
- `src/features/helpdesk-connections/components/clear-connection-message-query.tsx`:
  client-side helper that removes transient connection `success` and `error`
  query parameters after rendering redirected action messages.
- `src/features/helpdesk-connections/components/connection-page-shell.tsx`:
  shared page shell for protected connection management routes.
- `src/features/helpdesk-connections/components/connection-list.tsx`: local
  connection list with active, validate, enable/disable, edit, and delete forms.
- `src/features/helpdesk-connections/components/connection-form.tsx`: add/edit
  form that never echoes stored credentials to the browser.
- `src/features/saved-views/index.ts`: saved view feature boundary.
- `src/features/tickets/index.ts`: ticket workflow feature boundary. It does
  not export server actions so component/test imports do not pull in env or
  database modules.
- `src/features/tickets/actions.ts`: server action for staged selected-ticket
  state/priority metadata mutations from `/workspace`.
- `src/features/tickets/metadata-action-input.ts`: server-side FormData parser
  and validation for staged single-ticket metadata update payloads.
- `src/features/tickets/connection-context.ts`: active connection lookup,
  credential decryption, provider lookup, base URL revalidation, and setup
  timing for ticket reads and metadata mutations.
- `src/features/tickets/provider-dispatch.ts`: capability-gated ticket read and
  state/priority metadata mutation dispatch plus provider error to
  unavailable-state mapping.
- `src/features/tickets/mutation-model.ts`: provider-neutral state/priority
  metadata mutation capabilities, pending-date validation, result/error model,
  and action state types.
- `src/features/tickets/read-model.ts`: provider-neutral ticket read result,
  unavailable-state, metadata mutation capability exposure, and default list
  query types.
- `src/features/tickets/detail-action-result.ts`: client-safe workspace ticket
  detail action result and loader action function types.
- `src/features/tickets/detail-actions.ts`: authenticated server action for
  post-hydration workspace detail loads. It returns adapted workspace detail or
  provider-neutral unavailable state only.
- `src/features/tickets/service.ts`: thin ticket read orchestration and
  controlled state/priority metadata mutation entrypoints with refresh-after-
  write checks.
- `src/features/tickets/date-time-format.ts`: shared workspace date/time
  formatter for provider-backed ticket table, detail, thread, and metadata
  display strings.
- `src/features/tickets/workspace-adapter.ts`: canonical ticket/detail to
  workspace render model adapter, including formatted and ISO pending-time
  values for selected-ticket metadata drafts.
- `src/features/settings/index.ts`: settings feature boundary.
- `src/features/workspace/index.ts`: workspace feature boundary. UI copy may say
  workspace, but persisted domain concepts remain helpdesk connections. This
  barrel exports production workspace UI only.
- `src/features/workspace/components/ticket-workspace.tsx`: provider-backed
  workspace composition for the real `/workspace` route. It wires
  provider-neutral read models and state/priority mutation capabilities into
  approved production workspace components.
- `src/features/workspace/components/ticket-workspace-display.tsx`: client-side
  production workspace display composition for controls, tabs, table, and
  selected-ticket detail surfaces.
- `src/features/workspace/components/ticket-workspace-state.ts`: client-side
  workspace-only state for active pane, open ticket tabs, tab metadata patches
  after successful staged updates, tab orientation, visible columns, row
  selection, grouping, sorting, and route navigation.
- `src/features/workspace/components/use-ticket-detail-loader.ts`: in-memory
  per-workspace-session selected-ticket detail cache and client detail loader
  for post-hydration row opens.
- `src/features/workspace/components/workspace-url.ts`: workspace ticket/List
  URL path and history replacement helpers for local tab navigation.
- `src/features/workspace/components/workspace-header.tsx`: production
  workspace header presentation with brand, search, status icon, and an
  avatar/profile menu fed by real connection/action props.
- `src/features/workspace/components/workspace-controls.tsx`: read-safe
  workspace toolbar presentation for row selection, refresh, saved-view display,
  local grouping, column visibility, and the always-available tab layout
  segmented control. List-only controls remain mounted but disabled while a
  ticket pane is active.
- `src/features/workspace/components/workspace-states.tsx`: provider-neutral
  unavailable, detail-unavailable, and empty-detail states.
- `src/features/workspace/components/ticket-table-grid.tsx`: production
  ticket grid layout, header, and cell helpers driven by workspace column
  definitions.
- `src/features/workspace/components/ticket-table-cells.tsx`: production
  state and priority display cells driven by canonical ticket labels and keys.
- `src/features/workspace/components/ticket-table.tsx`: production ticket list
  table shell and row/header presentation for workspace ticket rows.
- `src/features/workspace/components/ticket-table-grouping.ts`: provider-neutral
  local presentation grouping and sorting helpers for loaded workspace rows.
- `src/features/workspace/components/ticket-detail.tsx`: production selected-
  ticket detail header and layout.
- `src/features/workspace/components/ticket-detail-sidebar.tsx`: production
  metadata sidebar shell for selected tickets.
- `src/features/workspace/components/ticket-metadata-editor.tsx`: staged
  single-ticket metadata editor for state, priority, pending date/time,
  Update, Discard changes, pending/error states, and changed-field treatment.
- `src/features/workspace/components/ticket-metadata-action-bar.tsx`: sticky
  full-width selected-ticket metadata action row with Discard changes and
  Update controls plus post-update navigation selection.
- `src/features/workspace/components/ticket-tab-metadata.ts`: small helper for
  patching open ticket tab display metadata after successful staged updates.
- `src/features/workspace/components/post-update-navigation.ts`: provider-
  neutral post-Update navigation values, localStorage helpers, and final-state
  navigation decision helper.
- `src/features/workspace/components/post-update-navigation-selector.tsx`:
  compact workspace selector for the persisted post-Update navigation
  preference.
- `src/features/workspace/components/metadata-draft.ts`: selected-ticket
  metadata draft diffing, validation, dirty-field detection, reset, and
  FormData construction helpers.
- `src/features/workspace/components/ticket-sidebar-field.tsx`: shared
  sidebar read-only and editable field wrappers.
- `src/features/workspace/components/ticket-pending-date-time.ts`: pending
  date/time parsing, formatting, default, and future-date helpers.
- `src/features/workspace/components/ticket-pending-state-form.tsx`: compact
  pending date/time input used by staged pending state transitions.
- `src/features/workspace/components/ticket-state-mutation-options.tsx`: state
  dropdown option helpers for provider-supplied hidden states and selected-value
  display.
- `src/features/workspace/components/ticket-thread.tsx`: production read-only
  ticket article thread presentation with sanitized rich-text rendering,
  display-name-first From/To/Cc/Bcc metadata, and no reply/composer controls.
- `src/features/workspace/components/ticket-tabs-panel.tsx`: production
  list/open-ticket tab panel composition.
- `src/features/workspace/components/ticket-tabs`: split production ticket-tab
  presentation helpers for horizontal tabs, vertical tabs, density calculation,
  and shared tab link rendering.
- `src/features/workspace/components/**`: production-safe presentational
  components extracted from approved workspace implementation decisions. They
  must not import provider services, repositories, server actions, or Zammad
  code.
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
- `src/components/ui/tooltip.tsx`: custom non-interactive tooltip primitive
  that opens on hover or keyboard-visible focus.
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
- `tests/unit/helpdesk-connections-service-helpers.ts`: in-memory repository,
  provider registry, and form helpers shared by helpdesk connection service
  tests.
- `tests/unit/helpdesk-connections-service-create-update.test.ts`: verifies
  connection creation, credential preservation, encryption, and metadata
  trimming behavior.
- `tests/unit/helpdesk-connections-service-lifecycle.test.ts`: verifies active
  connection clearing for disable/delete lifecycle operations.
- `tests/unit/helpdesk-connections-service-validation.test.ts`: verifies
  existing-connection provider validation error handling and safe diagnostics.
- `tests/unit/helpdesk-connections-security.test.ts`: verifies connection
  tamper resistance and active/enable security rules.
- `tests/unit/provider-http.test.ts`: verifies provider requests reject DNS
  rebinding and use pinned validated addresses.
- `tests/unit/provider-http-json.test.ts`: verifies provider JSON requests use
  pinned validated addresses, bounded response parsing, and safe JSON write
  request handling.
- `tests/unit/provider-boundary.test.ts`: verifies direct provider-specific
  imports stay out of core, UI, and feature code.
- `tests/unit/provider-registry.test.ts`: verifies provider registry lookup and
  duplicate-key protection.
- `tests/unit/sanitize-html.test.ts`: verifies provider HTML sanitization.
- `tests/unit/session-cookie.test.ts`: verifies secure session cookie options.
- `tests/unit/ticket-contract.test.ts`: verifies canonical ticket state and
  priority keys, labels, categories, and ranks.
- `tests/unit/workspace-date-time-format.test.ts`: verifies shared workspace
  date/time formatting omits the current year and uses 24-hour time.
- `tests/components`: component interaction tests for shared UI primitives.
- `tests/components/dropdowns.test.tsx`: verifies searchable and non-searchable
  dropdown keyboard and close behavior.
- `tests/components/menu-tooltip.test.tsx`: verifies menu, profile menu, and
  tooltip hover, keyboard-visible focus, and close behavior.
- `tests/components/primitives-state.test.tsx`: verifies basic primitive states.
- `tests/components/table.test.tsx`: verifies shared table wrappers and sortable
  table state.
- `tests/components/table-ticket.test.tsx`: verifies ticket tab and table header
  callbacks.
- `tests/features`: feature-level component tests.
- `tests/features/connection-message-query.test.tsx`: verifies transient
  connection action query parameters are removed after message rendering.
- `tests/features/ticket-workspace-test-utils.tsx`: shared provider-backed
  workspace fixtures and render helpers for feature tests.
- `tests/features/ticket-workspace.test.tsx`: verifies provider-backed
  workspace unavailable, table, profile menu, detail, read-only metadata, and
  grouping behavior.
- `tests/features/ticket-metadata-action-input.test.ts`: verifies staged
  selected-ticket metadata update payload parsing and pending date validation.
- `tests/features/ticket-metadata-action-revalidation.test.ts`: verifies
  successful metadata writes invalidate the workspace for saved and
  saved-refresh-failed action results.
- `tests/features/ticket-metadata-mutation-service.test.ts`: verifies
  provider-neutral metadata mutation service dispatch, capability failures,
  pending-date validation, unavailable-transition handling, and
  refresh-after-write results.
- `tests/features/ticket-metadata-mutation-workspace.test.tsx`: verifies
  workspace metadata mutation submit, hidden state options, pending date/time
  input, error, and staged non-optimistic UI behavior.
- `tests/features/ticket-overdue-pending-priority-update.test.tsx`: verifies
  overdue pending tickets can still submit priority-only staged metadata
  updates without resubmitting stale pending dates.
- `tests/features/ticket-staged-metadata-workspace.test.tsx`: verifies staged
  single-ticket metadata update behavior, changed-field treatment, discard,
  selected-ticket rebasing, and saved-refresh-failed UI handling.
- `tests/features/ticket-tab-metadata-sync.test.tsx`: verifies a successful
  staged state update immediately updates the active tab top-border state color
  before server refresh rehydrates the workspace.
- `tests/features/workspace-adapter.test.ts`: verifies ticket-to-workspace
  adapter display formatting for table/detail/thread date strings.
- `tests/features/ticket-workspace-horizontal-tabs.test.tsx`: verifies local
  horizontal ticket tab sizing, open/close/activation behavior, and route
  navigation without persistence.
- `tests/features/ticket-workspace-vertical-tabs.test.tsx`: verifies local
  vertical ticket tab orientation, open/activation behavior, and route
  navigation without persistence.
- `tests/features/ticket-workspace-url-sync.test.tsx`: verifies local
  ticket/List URL replacement for already-open tab activation and active-tab
  close fallback behavior.
- `tests/providers`: provider-specific tests.
- `tests/providers/zammad/credentials.test.ts`: verifies provider-specific Basic
  Auth credential helpers.
- `tests/providers/zammad/mapping.test.ts`: verifies provider-specific raw state
  and priority mapping to canonical ticket keys.
- `tests/providers/zammad/mutation-policy.test.ts`: verifies Zammad-only state
  mutation availability constraints.
- `tests/providers/zammad/read-helpers.ts`: shared Zammad read test fixtures.
- `tests/providers/zammad/read.test.ts`: verifies Zammad ticket list/detail
  endpoint calls, canonical mapping, optional feature defaults, and read timing.
- `tests/providers/zammad/mutations.test.ts`: verifies Zammad state/priority
  metadata write payload mapping, orphan pending-time rejection, and
  provider-safe request usage.
- `tests/providers/zammad/read-assets.test.ts`: verifies Zammad attachment
  metadata and expanded user display-name asset mapping.
- `tests/providers/zammad/validation.test.ts`: verifies provider-specific Basic
  Auth validation request behavior.
- `tests/setup.ts`: component test cleanup and DOM matcher setup.
- `docs/architecture`: public architecture and boundary docs.
- `docs/architecture/overview.md`: core product and architecture boundaries.
- `docs/architecture/provider-plugins.md`: provider plugin ownership and
  registration rules.
- `docs/architecture/ticket-read-contract.md`: canonical provider-neutral
  ticket read model, controlled state/priority metadata mutation contract,
  thread article shape, capabilities, and non-goals.
- `docs/architecture/codebase-map.md`: this file-role map.
- `docs/deploy`: environment and deployment docs, including `.env.example`.
- `docs/deploy/.env.example`: committed environment template.
- `docs/deploy/environment.md`: environment variable purpose and handling.
- `docs/deploy/systemd/resolvrr-dev.service.example`: user-level dev service
  template.
- `docs/development`: local development workflow docs.
- `docs/development/local-development.md`: development commands, service names,
  and local boundaries.
- `docs/development/dependency-updates.md`: Dependabot and human-authored
  dependency update handling rules.
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
