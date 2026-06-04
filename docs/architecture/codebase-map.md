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
  composes the active helpdesk connection ticket read path, controlled metadata
  mutation action, internal-note action, and customer-reply action into the real
  workspace.
- `src/app/globals.css`: global Tailwind import, base document styles, and
  default plain-anchor color.
- `src/core`: provider-neutral domain contracts and canonical values.
- `src/core/tickets.ts`: canonical ticket values and provider-neutral
  ticket/thread/link/subscription/mutation/communication types.
- `src/core/ticket-list-query.ts`: provider-neutral list query, sort, count,
  grouping, pagination, result contracts, and normalization.
- `src/core/ticket-lookups.ts`: provider-neutral lookup option, lookup result,
  and request-scoped lookup cache-policy contracts.
- `src/core/saved-views.ts`: provider-neutral saved view filters, conditions,
  query defaults, storage helpers, and metadata.
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
- `src/data/saved-views-repository.ts`: Prisma-backed saved view/preference
  repository and seeded-view dismissal persistence.
- `src/data/workspace-tabs-repository.ts`: Prisma-backed user and active
  helpdesk-connection scoped `UiPreference` repository for persisted workspace
  open tabs.
- `src/security`: security-sensitive helpers shared by server-side code.
- `src/security/encryption.ts`: AES-256-GCM secret envelope encryption.
- `src/security/base-url-validation.ts`: provider-neutral HTTPS and SSRF
  validation for user-provided helpdesk base URLs.
- `src/security/provider-http.ts`: public SSRF-safe provider HTTPS/JSON helper
  boundary and exports.
- `src/security/provider-http-request.ts`: provider HTTP request internals for
  revalidated address binding, redirects-disabled fetches, bounded
  reads/writes, and safe JSON body errors.
- `src/security/sanitize-html.ts`: provider HTML sanitization that preserves
  safe rich-text article structure such as links, lists, headings, tables, and
  inline emphasis while dropping scripts and unsafe attributes.
- `src/security/safe-log.ts`: helper for safe metadata-only logs.
- `src/telemetry/ticket-read-timing.ts`: sanitized ticket timing logger used by
  provider-backed list/detail orchestration, controlled metadata mutations, and
  provider request/mapping phases.
- `src/telemetry/ticket-mutation-audit.ts`: sanitized metadata mutation audit
  logger that records only mutation field names/counts and outcome metadata.
- `src/telemetry/ticket-communication-audit.ts`: sanitized communication audit
  logger that records only communication kind and outcome metadata.
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
- `src/providers/zammad/mutations.ts`: Zammad-only state, priority, owner,
  group, tag, link, and subscription metadata write orchestration, pending-time
  payload construction, state-transition guard, and endpoint call
  implementation.
- `src/providers/zammad/ticket-article-mutations.ts`: Zammad-only ticket article
  write helpers for internal note and customer reply creation.
- `src/providers/zammad/participants.ts`: Zammad user/participant display-name,
  email fallback, recipient, and expanded asset mapping helpers.
- `src/providers/zammad/plugin.ts`: provider plugin object, capabilities, and
  connection validation boundary.
- `src/providers/zammad/schemas.ts`: Zammad raw ticket, article, expanded asset,
  and user DTO schemas.
- `src/providers/zammad/ticket-search-query.ts`: Zammad ticket search path,
  sort, state/priority filter, and state/priority bucket query construction.
- `src/providers/zammad/ticket-groups.ts`: Zammad provider-owned
  state/priority bucket discovery and grouped list page orchestration.
- `src/providers/zammad/ticket-list.ts`: Zammad ticket list endpoint reads,
  search-backed list totals, list asset lookup, read-phase timing, and
  canonical list response assembly.
- `src/providers/zammad/ticket-link-targets.ts`: Zammad provider-local ticket
  search for Add link targets, including provider-local same-customer query
  mapping, mapped to provider-neutral link target summaries.
- `src/providers/zammad/ticket-lookups.ts`: Zammad assignable-user, group, and
  global tag suggestion lookup reads mapped to provider-neutral lookup options.
- `src/providers/zammad/ticket-secondary.ts`: optional Zammad selected-ticket
  secondary reads for tags, related ticket links, subscription state, and
  missing group-name lookup.
- `src/providers/zammad/ticket-secondary-mutations.ts`: Zammad selected-ticket
  secondary metadata writes for tags, related links, relation-kind link adds,
  and subscription state.
- `src/providers/zammad/ticket-subscription.ts`: Zammad subscription/following
  reads through `/users/me` and `/mentions`, with provider-safe unavailable
  diagnostics for optional detail fallback behavior.
- `src/providers/zammad/tickets.ts`: Zammad ticket detail/thread endpoint reads
  and canonical detail response assembly with provider-neutral secondary data;
  list reads are re-exported from the provider-local list module.
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
- `src/features/helpdesk-connections/service.ts`: connection mutation use cases
  for ownership, encrypted credential handling, SSRF validation, and provider
  validation.
- `src/features/helpdesk-connections/service-listing.ts`: connection provider
  option, list, and edit-read use cases.
- `src/features/helpdesk-connections/service-types.ts`: provider option,
  connection list item, and mutation result shapes.
- `src/features/helpdesk-connections/form-parsing.ts`: provider-neutral
  connection form parsing and blank credential preservation rules.
- `src/features/helpdesk-connections/provider-validation.ts`: connection
  validation helper that combines SSRF validation with provider validation,
  safe failure messages, and metadata-only diagnostics.
- `src/features/helpdesk-connections/messages.ts`: user-safe connection action
  messages.
- `src/features/helpdesk-connections/index.ts`: helpdesk connection feature
  exports.
- `src/features/saved-views/index.ts`: saved view feature boundary.
- `src/features/saved-views/actions.ts`: server actions for non-redirecting
  workspace saved-view Settings mutations and lookup-backed settings data.
- `src/features/saved-views/conditions.ts`: provider-neutral condition
  validation, `My work` seed conditions, and query compilation.
- `src/features/saved-views/lucide-icon-names.ts`: curated and normalized
  Lucide icon-name validation for saved-view appearance.
- `src/features/saved-views/repository.ts`: saved view repository contract and
  stored view/preference shapes.
- `src/features/saved-views/service.ts`: saved view query sanitization,
  guardrails, seed/default handling, and create/update/delete/reorder use cases.
- `src/features/saved-views/settings-model.ts`: serializable Settings Views
  data and action result contracts.
- `src/features/saved-views/workspace.ts`: workspace saved-view option mapping
  and unsupported-view flagging.
- `src/features/tickets/index.ts`: ticket workflow feature boundary. It does
  not export server actions so component/test imports do not pull in env or
  database modules.
- `src/features/tickets/actions.ts`: server action for staged selected-ticket
  metadata and communication update payloads from `/workspace`.
- `src/features/tickets/communication-actions.ts`: standalone server actions
  for selected-ticket internal-note and customer-reply submits. The production
  workspace currently stages these writes through the shared selected-ticket
  `Update` action instead.
- `src/features/tickets/communication-action-input.ts`: server-side parser and
  validation for selected-ticket internal-note and customer-reply submit
  payloads.
- `src/features/tickets/communication-dispatch.ts`: capability-gated
  internal-note/customer-reply provider dispatch plus provider error mapping.
- `src/features/tickets/communication-model.ts`: provider-neutral
  communication payload, capability, result, and action-state types.
- `src/features/tickets/communication-service.ts`: communication write
  orchestration with selected-ticket detail refresh-after-write checks and
  metadata-only communication outcome audit logs.
- `src/features/tickets/metadata-action-input.ts`: server-side parser and
  validation for one selected-ticket update payload per explicit `Update`,
  including communication, tag, link relation, subscription, pending-date, and
  raw provider field validation.
- `src/features/tickets/connection-context.ts`: active connection lookup,
  credential decryption, provider lookup, base URL revalidation, and setup
  timing for ticket reads and metadata mutations.
- `src/features/tickets/provider-dispatch.ts`: capability-gated ticket read,
  lookup, and metadata mutation dispatch plus provider error to
  unavailable-state mapping.
- `src/features/tickets/link-target-actions.ts`: authenticated server action
  for Add link modal target search, passing provider-neutral query and
  customer filters and returning unavailable state or link target summaries.
- `src/features/tickets/link-target-search-action-result.ts`: client-safe Add
  link target search request/result and action function types, including the
  optional provider-neutral customer external ID filter.
- `src/features/tickets/link-target-service.ts`: provider-neutral Add link
  target search orchestration, capability-gated provider dispatch, and
  provider-error mapping.
- `src/features/tickets/mutation-model.ts`: provider-neutral metadata mutation
  capabilities, selected-ticket update payload shape, allowed update
  payload/slice keys, pending-date validation, result/error model, and action
  state types.
- `src/features/tickets/list-query-guardrails.ts`: provider-neutral list query
  capability derivation and guardrail checks for unsupported or expensive query
  requests before provider dispatch.
- `src/features/tickets/read-model.ts`: provider-neutral ticket read result,
  unavailable-state, metadata mutation and communication capability exposure,
  and default list query types.
- `src/features/tickets/detail-action-result.ts`: client-safe workspace ticket
  detail action result and loader action function types.
- `src/features/tickets/detail-actions.ts`: authenticated server action for
  post-hydration workspace detail loads. It returns adapted workspace detail or
  provider-neutral unavailable state only.
- `src/features/tickets/list-page-action-result.ts`: client-safe workspace
  ticket list page action result and loader action function types.
- `src/features/tickets/list-actions.ts`: authenticated server action for
  post-hydration ungrouped workspace list page loads. It returns adapted
  workspace rows and provider-neutral pagination metadata only.
- `src/features/tickets/service.ts`: thin ticket read orchestration and
  controlled metadata mutation entrypoints with refresh-after-write checks.
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
- `src/features/workspace/actions.ts`: server actions for workspace-owned UI
  state, including active-connection scoped persisted open tabs.
- `src/features/workspace/workspace-tab-state.ts`: provider-neutral persisted
  workspace tab state parser, serializer, cap, and ticket-detail tab adapter
  helpers.
- `src/features/workspace/components/ticket-workspace.tsx`: provider-backed
  workspace composition for the real `/workspace` route. It wires
  provider-neutral read models, metadata mutation capabilities, and
  communication capabilities into approved production workspace components.
- `src/features/workspace/components/ticket-workspace-display.tsx`: client-side
  production workspace display composition for controls, tabs, table, and
  selected-ticket detail surfaces.
- `src/features/workspace/components/ticket-workspace-state.ts`: client-side
  workspace-only state for active pane, open ticket tabs, recently viewed tabs,
  tab metadata patches after successful staged updates, tab orientation, visible
  columns, row selection, grouping, sorting, and route navigation.
- `src/features/workspace/components/ticket-workspace-persisted-tabs.ts`:
  focused helper for deriving initial open, recent, and active workspace tabs
  from saved server UI state and direct selected-ticket detail.
- `src/features/workspace/components/ticket-workspace-state-types.ts`: shared
  workspace display state prop and active-pane types.
- `src/features/workspace/components/use-ticket-detail-loader.ts`: in-memory
  per-workspace-session selected-ticket detail cache and client detail loader
  for post-hydration row opens.
- `src/features/workspace/components/use-ticket-list-pager.ts`: in-memory
  active-workspace list pager for appending provider-backed ungrouped list pages
  and reloading page 1 for provider-backed sort changes or state/priority
  grouped buckets after the provider reload succeeds, while preserving
  provider-backed total count metadata and independent grouped-bucket cursors
  without touching selected-ticket detail reads.
- `src/features/workspace/components/ticket-list-pager-rows.ts`: list pager
  request, identity, row append, and refreshed-baseline merge helpers.
- `src/features/workspace/components/ticket-list-pager-types.ts`: list pager
  hook prop type boundary.
- `src/features/workspace/components/workspace-url.ts`: workspace ticket/List
  URL path helper used by local tab navigation and explicit ticket link sharing,
  plus history replacement helpers for local tab navigation.
- `src/features/workspace/components/workspace-header.tsx`: production
  workspace header presentation with brand, global search, tab layout controls,
  and an avatar/profile menu fed by real connection/action props.
- `src/features/workspace/components/workspace-controls.tsx`: read-safe
  workspace presentation for the always-available tab layout segmented control.
- `src/features/workspace/components/workspace-settings-dialog.tsx`: 90vw/90vh
  Settings shell with Profile, Workspaces, and Views sections.
- `src/features/workspace/components/workspace-settings-workspaces-section.tsx`:
  in-modal helpdesk connection management surface.
- `src/features/workspace/components/workspace-settings-views-section.tsx`: in-modal
  saved-view list and edit/create surface.
- `src/features/workspace/components/workspace-settings-view-conditions.tsx`:
  provider-neutral condition builder used by the Views settings section.
- `src/features/workspace/components/workspace-settings-views-list.tsx`: left-pane
  saved-view list with default markers and reorder controls.
- `src/features/workspace/components/workspace-settings-views-utils.tsx`: local
  saved-view draft, icon, color, and condition-value helpers for Settings Views.
- `src/features/workspace/components/ticket-list-toolbar.tsx`: list-only
  toolbar for Select all, Refresh, the disabled Bulk actions placeholder, saved
  view selection, grouping, and column visibility above the ticket table.
- `src/features/workspace/components/ticket-column-visibility-action.tsx`:
  reusable column visibility menu used by the list toolbar.
- `src/features/workspace/components/workspace-states.tsx`: provider-neutral
  unavailable, detail-unavailable, and empty-detail states.
- `src/features/workspace/components/ticket-table-grid.tsx`: production
  ticket grid layout, header, and cell helpers driven by workspace column
  definitions.
- `src/features/workspace/components/ticket-table-cells.tsx`: production
  state and priority display cells driven by canonical ticket labels and keys.
- `src/features/workspace/components/ticket-table.tsx`: production ticket list
  table shell, select-all header control, and row/header presentation for
  workspace ticket rows.
- `src/features/workspace/components/ticket-table-row.tsx`: production ticket
  table row rendering and row cell value mapping.
- `src/features/workspace/components/ticket-table-group-header.tsx`: grouped
  ticket table bucket header rendering and grouped-load-more controls.
- `src/features/workspace/components/ticket-table-types.ts`: ticket table group
  shape shared by grouped table modules.
- `src/features/workspace/components/ticket-table-grouping.ts`: provider-neutral
  local presentation grouping and sorting helpers for loaded workspace rows.
- `src/features/workspace/components/ticket-detail.tsx`: production selected-
  ticket detail header and layout.
- `src/features/workspace/components/ticket-detail-sidebar.tsx`: production
  metadata sidebar shell for selected-ticket subscription, tags, links, and
  editor-provided metadata controls.
- `src/features/workspace/components/ticket-lookup-options.tsx`: compact
  read-only provider-neutral lookup option list rendering for selected-ticket
  sidebar fields.
- `src/features/workspace/components/ticket-metadata-editor.tsx`: selected-
  ticket draft editor for state, priority, owner, group, secondary metadata,
  pending date/time, Update, Discard changes, pending/error states, and
  changed-field treatment.
- `src/features/workspace/components/ticket-metadata-editor-state.tsx`: stateful
  selected-ticket draft editor implementation used by the thin editor wrapper.
- `src/features/workspace/components/ticket-primary-metadata-fields.tsx`:
  state, priority, and pending date/time sidebar controls that render editable
  inputs only when the provider advertises matching write capabilities.
- `src/features/workspace/components/ticket-assignment-fields.tsx`: owner/group
  assignment sidebar controls that render editable dropdowns only when the
  provider advertises write capabilities and lookup options are available.
- `src/features/workspace/components/ticket-secondary-metadata-fields.tsx`:
  thin composition wrapper for selected-ticket subscription, tags, and related
  links sidebar sections.
- `src/features/workspace/components/ticket-secondary-subscription-field.tsx`:
  compact subscription toggle sidebar section that renders editable state only
  when the provider advertises subscription writes.
- `src/features/workspace/components/ticket-secondary-tags-field.tsx`: tag chip
  combobox sidebar section with provider-neutral suggestions, inline add-tag
  entry, and removable chips when tag writes are supported.
- `src/features/workspace/components/ticket-add-link-dialog.tsx`: workspace-
  local Add link modal for searching/staging one ticket link target and relation
  kind without provider writes, including same-customer and session-recent
  candidate sections.
- `src/features/workspace/components/ticket-add-link-search-results.tsx`:
  compact Add link modal candidate/result list and unavailable/empty/searching
  states.
- `src/features/workspace/components/ticket-add-link-relation-options.tsx`: Add
  link modal relation radio choices with Parent/Child disabled when unsupported.
- `src/features/workspace/components/ticket-secondary-links-field.tsx`: linked
  ticket sidebar rows, staged pending-link display, and Add link modal trigger
  when related-link writes are supported.
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
- `src/features/workspace/components/metadata-draft.ts`: selected-ticket draft
  shell plus metadata-slice diffing, validation, dirty-field detection, reset,
  explicitly enabled editable-slice guardrail, and structured update-payload
  construction helpers for primary and secondary metadata.
- `src/features/workspace/components/ticket-sidebar-field.tsx`: shared
  sidebar read-only and editable field wrappers.
- `src/features/workspace/components/ticket-pending-date-time.ts`: pending
  date/time parsing, formatting, default, and future-date helpers.
- `src/features/workspace/components/ticket-pending-state-form.tsx`: compact
  pending date/time input used by staged pending state transitions.
- `src/features/workspace/components/ticket-priority-mutation-options.tsx`:
  priority dropdown options for staged priority updates.
- `src/features/workspace/components/ticket-state-mutation-options.tsx`: state
  dropdown option helpers for provider-supplied hidden states and selected-value
  display.
- `src/features/workspace/components/ticket-article-attachments.tsx`: read-only
  article attachment metadata presentation. It displays provider-neutral
  filename, content type, and byte size values only; downloads and previews are
  intentionally not exposed here.
- `src/features/workspace/components/ticket-inline-communication-composer.tsx`:
  capability-gated inline Reply/Comment textarea shared by article cards. It
  stages text in the selected-ticket draft and has no local Send/Cancel footer.
- `src/features/workspace/components/ticket-thread-article.tsx`: production
  article-card presentation with sanitized rich-text rendering,
  display-name-first From/To/Cc/Bcc metadata, attachment metadata display, and
  provider-neutral inline Reply, disabled Reply all, and Comment actions.
- `src/features/workspace/components/ticket-thread-article-styles.ts`: narrow
  class-map companion for thread article variants and action selected states.
- `src/features/workspace/components/ticket-thread.tsx`: production ticket
  article thread state owner. It tracks one active inline composer by article
  and mode, writes composer text into the selected-ticket draft, and does not
  render standalone bottom communication composers.
- `src/features/workspace/components/ticket-tabs-merge.ts`: helper for merging
  initial selected-ticket tabs with row-derived tabs.
- `src/features/workspace/components/ticket-tabs-panel.tsx`: production
  list/open-ticket tab panel composition.
- `src/features/workspace/components/ticket-tabs`: split production ticket-tab
  presentation helpers for horizontal tabs, vertical tabs, list refresh and
  column actions, density calculation, and shared tab link rendering.
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
- `src/components/ui/menu-dropdown-measure.tsx`: hidden measurement shell for
  menu dropdown natural-width behavior.
- `src/components/ui/menu-navigation.ts`: shared menu item navigation and
  typeahead helpers.
- `src/components/ui/profile-menu.tsx`: generic profile-style menu trigger and
  menu composition.
- `src/components/ui/searchable-dropdown.tsx`: searchable single-select
  dropdown primitive.
- `src/components/ui/searchable-dropdown-parts.tsx`: searchable dropdown
  option filtering, hidden measurement, and row rendering helpers.
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
- `scripts/zammad-boundary-audit.mjs`: scans current source/docs or PR history
  for direct Zammad imports and raw Zammad token leakage outside the provider
  boundary allowlist.
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
- `tests/unit/provider-boundary.test.ts`: verifies direct Zammad imports and raw
  Zammad tokens stay out of core, UI, feature, and provider-neutral code.
- `tests/unit/provider-registry.test.ts`: verifies provider registry lookup and
  duplicate-key protection.
- `tests/unit/sanitize-html.test.ts`: verifies provider HTML sanitization.
- `tests/unit/session-cookie.test.ts`: verifies secure session cookie options.
- `tests/unit/ticket-contract.test.ts`: verifies canonical ticket state and
  priority keys, labels, categories, and ranks.
- `tests/unit/ticket-list-query.test.ts`: verifies provider-neutral ticket list
  query defaults, normalization, count/group shapes, page-size guardrails, and
  unknown provider-specific field stripping.
- `tests/unit/workspace-date-time-format.test.ts`: verifies shared workspace
  date/time formatting omits the current year and uses 24-hour time.
- `tests/components`: component interaction tests for shared UI primitives.
- `tests/components/dropdowns.test.tsx`: verifies searchable and non-searchable
  dropdown keyboard and close behavior.
- `tests/components/menu-tooltip.test.tsx`: verifies menu and profile menu
  behavior.
- `tests/components/tooltip.test.tsx`: verifies tooltip hover,
  keyboard-visible focus, viewport positioning, portal rendering, and close
  behavior.
- `tests/components/primitives-state.test.tsx`: verifies basic primitive states.
- `tests/components/table.test.tsx`: verifies shared table wrappers and sortable
  table state.
- `tests/components/table-ticket.test.tsx`: verifies ticket tab and table header
  callbacks.
- `tests/features`: feature-level component tests.
- `tests/features/connection-message-query.test.tsx`: verifies transient
  connection action query parameters are removed after message rendering.
- `tests/features/saved-view-management.test.ts`: verifies saved-view condition
  compilation, `My work` seed/default behavior, delete/default guardrails, and
  shared-view permissions.
- `tests/features/saved-view-persistence.test.ts`: verifies saved view
  persistence sanitization, guardrails, and storage round-tripping.
- `tests/features/saved-view-workspace.test.ts`: verifies workspace saved-view performance guardrails and provider-neutral disabled labels.
- `tests/features/ticket-workspace-test-utils.tsx`: shared provider-backed
  workspace fixtures and render helpers for feature tests.
- `tests/features/ticket-workspace.test.tsx`: verifies provider-backed
  workspace unavailable, table, profile menu, read-only metadata, and list
  controls behavior.
- `tests/features/ticket-workspace-selected-detail.test.tsx`: verifies selected
  ticket detail, thread rendering, secondary metadata chips/links, article
  recipients, and attachment display.
- `tests/features/ticket-workspace-paging-sort.test.tsx`: verifies
  post-hydration ungrouped list page loading, refreshed baseline row merging,
  provider-backed sorting, and grouped reload behavior.
- `tests/features/ticket-workspace-grouping.test.tsx`: verifies provider-backed
  workspace state/priority grouping and per-bucket pagination behavior.
- `tests/features/ticket-workspace-saved-views.test.tsx`: verifies workspace
  saved-view selection and unsupported options.
- `tests/features/ticket-list-action.test.ts`: verifies client-safe
  post-hydration workspace list page action results.
- `tests/features/ticket-list-action-saved-views.test.ts`: verifies saved-view
  application, global/active connection scope, and rejected cross-connection
  workspace list page loads.
- `tests/features/ticket-metadata-action-input.test.ts`: verifies one
  selected-ticket update payload parsing, server-boundary validation, and
  pending date validation across primary metadata, secondary metadata, and
  staged communication fields.
- `tests/features/ticket-internal-note-action-input.test.ts`: verifies
  selected-ticket communication payload parsing and unsupported-key rejection.
- `tests/features/ticket-internal-note-service.test.ts`: verifies
  provider-neutral internal-note and customer-reply service dispatch,
  capability failures, and refresh-after-write results.
- `tests/features/ticket-communication-audit.test.ts`: verifies communication
  audit logs preserve saved, saved-refresh-failed, and failed outcomes without
  logging raw ticket IDs, note/reply bodies, provider bodies, or customer
  content.
- `tests/features/ticket-metadata-action-revalidation.test.ts`: verifies
  successful metadata writes invalidate the workspace for saved and
  saved-refresh-failed action results.
- `tests/features/ticket-metadata-mutation-service.test.ts`: verifies
  provider-neutral metadata mutation service dispatch, capability failures,
  pending-date validation, unavailable-transition handling, and
  refresh-after-write results.
- `tests/features/ticket-metadata-mutation-audit.test.ts`: verifies mutation
  audit logs preserve saved-refresh-failed and failed outcomes without logging
  raw ticket IDs, metadata values, provider bodies, or customer content.
- `tests/features/ticket-owner-group-metadata-service.test.ts`: verifies owner
  and group metadata mutation dispatch and capability gating.
- `tests/features/ticket-secondary-metadata-service.test.ts`: verifies tags,
  links, and subscription mutation dispatch and capability gating.
- `tests/features/ticket-service-test-helpers.ts`: shared ticket service test
  repository, provider, connection, and encryption fixtures.
- `tests/features/ticket-service-query.test.ts`: verifies ticket list query
  normalization, count requests, capability rejection, page-size constraining,
  and provider-boundary dispatch fields.
- `tests/features/ticket-list-query-guardrails.test.ts`: verifies
  provider-neutral list query capability derivation and unsupported or
  too-expensive query rejection before provider dispatch.
- `tests/features/ticket-metadata-mutation-workspace.test.tsx`: verifies
  workspace metadata mutation submit, hidden state options, pending date/time
  input, error, and staged non-optimistic UI behavior.
- `tests/features/ticket-overdue-pending-priority-update.test.tsx`: verifies
  overdue pending tickets can still submit priority-only staged metadata
  updates without resubmitting stale pending dates.
- `tests/features/selected-ticket-draft.test.ts`: verifies the selected-ticket
  draft shell, metadata dirty-field tracking, discard/reset copy behavior, and
  provider-neutral metadata submit payload construction.
- `tests/features/ticket-staged-metadata-workspace.test.tsx`: verifies staged
  single-ticket metadata update behavior, changed-field treatment, discard,
  selected-ticket rebasing, and saved-refresh-failed UI handling.
- `tests/features/ticket-owner-group-metadata-workspace.test.tsx`: verifies
  owner and group staged metadata controls submit through the shared Update
  action.
- `tests/features/ticket-secondary-metadata-workspace.test.tsx`: verifies tags,
  related links, and subscription staged metadata controls submit through the
  shared Update action.
- `tests/features/ticket-internal-notes-workspace.test.tsx`: verifies
  explicit internal-note and customer-reply submits, pending/error behavior, and
  selected-detail refresh after saved communication writes.
- `tests/features/ticket-tab-metadata-sync.test.tsx`: verifies a successful
  staged state update immediately updates the active tab top-border state color
  before server refresh rehydrates the workspace.
- `tests/features/workspace-adapter.test.ts`: verifies ticket-to-workspace
  adapter display formatting for table/detail/thread date strings.
- `tests/features/ticket-workspace-horizontal-tabs.test.tsx`: verifies local
  horizontal ticket tab sizing, open/close/activation behavior, route
  navigation, restored saved tabs, direct-link tab merge, and persisted tab
  state writes.
- `tests/features/ticket-workspace-vertical-tabs.test.tsx`: verifies local
  vertical ticket tab orientation, open/activation behavior, and route
  navigation without persistence.
- `tests/features/ticket-workspace-url-sync.test.tsx`: verifies direct initial
  selected-ticket URLs, explicit ticket link copying, and local ticket/List URL
  replacement for already-open tab activation and active-tab close fallback
  behavior.
- `tests/features/ticket-workspace-client-detail-cache.test.tsx`: verifies
  selected-ticket detail cache refresh after metadata saves and cached-detail
  reuse when returning to an open ticket.
- `tests/features/workspace-tab-actions.test.ts`: verifies the workspace tab
  server action validates state and writes through the active helpdesk
  connection.
- `tests/features/workspace-tab-state.test.ts`: verifies persisted workspace tab
  state parsing guardrails, dedupe, and cap behavior.
- `tests/providers`: provider-specific tests.
- `tests/providers/zammad/credentials.test.ts`: verifies provider-specific Basic
  Auth credential helpers.
- `tests/providers/zammad/mapping.test.ts`: verifies provider-specific raw state
  and priority mapping to canonical ticket keys.
- `tests/providers/zammad/mutation-policy.test.ts`: verifies Zammad-only state
  mutation availability constraints.
- `tests/providers/zammad/read-helpers.ts`: shared Zammad read test fixtures.
- `tests/providers/zammad/read.test.ts`: verifies Zammad ticket list endpoint
  calls, search-backed total counts and grouped bucket counts, canonical list
  mapping, and read timing.
- `tests/providers/zammad/ticket-search-query.test.ts`: verifies Zammad-owned
  compilation of provider-neutral saved-view filters, including negative
  filters, into Zammad search syntax.
- `tests/providers/zammad/read-detail.test.ts`: verifies Zammad ticket detail
  and article-thread endpoint calls, optional feature defaults, sanitization,
  and detail read timing.
- `tests/providers/zammad/mutations.test.ts`: verifies Zammad state, priority,
  owner, and group metadata write payload mapping, orphan pending-time
  rejection, and provider-safe request usage.
- `tests/providers/zammad/internal-notes.test.ts`: verifies Zammad internal note
  and customer reply article payloads and provider-safe request usage.
- `tests/providers/zammad/secondary-mutations.test.ts`: verifies Zammad tag,
  related-link, and subscription metadata write endpoint payloads.
- `tests/providers/zammad/subscription-diagnostics.test.ts`: verifies Zammad
  subscription secondary-read fallback diagnostics for current-user and mentions
  endpoint failures or malformed responses.
- `tests/providers/zammad/read-assets.test.ts`: verifies Zammad attachment
  metadata mapping.
- `tests/providers/zammad/read-lookup-assets.test.ts`: verifies Zammad expanded
  user display-name asset lookup behavior.
- `tests/providers/zammad/validation.test.ts`: verifies provider-specific Basic
  Auth validation request behavior.
- `tests/setup.ts`: component test cleanup and DOM matcher setup.
- `docs/architecture`: public architecture and boundary docs.
- `docs/architecture/overview.md`: core product and architecture boundaries.
- `docs/architecture/provider-plugins.md`: provider plugin ownership and
  registration rules.
- `docs/architecture/ticket-read-contract.md`: canonical provider-neutral
  ticket read model, controlled metadata mutation contract, thread article
  shape, capabilities, and non-goals.
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
