# Codebase Map

This map records the role of created folders and files. Every current
non-generated repository file should be named literally in this document;
wildcard summaries are convenience descriptions only. Update it when files are
added, moved, renamed, or removed.

## Documented File-Size Exceptions

- This map is the repository's exhaustive literal file inventory and is exempt from the handwritten
  module cap by `scripts/check-file-sizes.mjs`; splitting it would defeat its single-index purpose.
- `ticket-read-contract.md` was already above 300 lines and remains one normative lifecycle
  contract. Contextual-reply additions are kept with the read/write invariants they constrain; the
  document remains below the 500-line merge blocker.
- `cache-and-privacy-contract.md` was already above 300 lines and remains one coupled cache/privacy
  threat-boundary contract. Contextual-reply and merged-source changes stay with their cache-key,
  invalidation, and draft-retention rules; the document remains below the 500-line merge blocker.
- `workspace-ui-contract.md` remains one normative interaction contract. Splitting workspace
  identity, ticket, settings, and accessibility invariants would make cross-surface behavior harder
  to review; it remains below the 500-line merge blocker.

## Root Files

- `.github`: GitHub automation configuration.
  - `.github/workflows`: GitHub Actions workflow definitions.
    - `ci.yml` (`.github/workflows/ci.yml`): GitHub Actions workflow for normal verification CI on
      pull requests and pushes to `main`.
    - `dependency-audit.yml` (`.github/workflows/dependency-audit.yml`): dependency-only audit
      workflow for package manifest or lockfile changes, with manual dispatch support.
    - `codeql.yml` (`.github/workflows/codeql.yml`): GitHub CodeQL workflow for JavaScript and
      TypeScript analysis on main, pull requests to main, and a weekly schedule.
  - `dependabot.yml` (`.github/dependabot.yml`): Dependabot update configuration for npm packages
    and GitHub Actions.
- `public`: static public assets served directly by Next.
  - `public/brand`: static rendered brand assets for the app shell.
    - `resolvrr-logo.svg` (`public/brand/resolvrr-logo.svg`): supplied Resolvrr brand image rendered
      in the workspace header.
- `.gitignore`: keeps local secrets, dependencies, build output, generated clients, logs, private
  memory, and editor files out of the app repo.
- `docker-compose.yml`: project-specific local Postgres service.
- `eslint.config.mjs`: flat ESLint configuration for TypeScript and Next.
- `next-env.d.ts`: Next-maintained TypeScript references.
- `next.config.ts`: Next configuration, including browser-facing dev origin handling.
- `playwright.config.ts`: opt-in, Chromium-only browser verification with serial execution,
  gitignored local authentication state, bounded artifacts, and no automatic server startup.
- `package-lock.json`: npm dependency lockfile, created by `npm install`.
- `package.json`: npm scripts and pinned application dependencies.
- `postcss.config.mjs`: Tailwind CSS PostCSS integration.
- `prisma.config.ts`: Prisma 7 CLI configuration, schema-folder selection, and database URL loading.
- `tsconfig.json`: strict TypeScript configuration and `@/*` source alias.
- `vitest.config.ts`: unit and component test configuration.

## Source Folders

- `src`: runtime application source.
  - `src/app`: thin Next route and layout files. Product logic should move into feature, core,
    provider, data, or UI modules.
    - `src/app/login`: contains related login files.
      - `page.tsx` (`src/app/login/page.tsx`): minimal sign-in form wired to a server action.
    - `src/app/register`: contains related register files.
      - `page.tsx` (`src/app/register/page.tsx`): minimal registration form wired to a server
        action.
    - `src/app/workspace`: contains related workspace files.
      - `page.tsx` (`src/app/workspace/page.tsx`): protected authenticated workspace route that
        composes the active helpdesk connection ticket read path, controlled metadata mutation
        action, internal-note action, and customer-reply action into the real workspace.
      - `workspace-page-helpers.ts` (`src/app/workspace/workspace-page-helpers.ts`): route-local
        saved-view list query helper for the workspace page.
    - `src/app/api/helpdesk-connections/[connectionId]/tickets/[ticketExternalId]/articles/[articleExternalId]/inline-images/[attachmentExternalId]`:
      authenticated, private/no-store provider-neutral inline ticket-image route with bounded path
      validation and safe response headers.
    - `src/app/api/helpdesk-connections/[connectionId]/tickets/[ticketExternalId]/articles/[articleExternalId]/attachments/[attachmentExternalId]`:
      authenticated, private/no-store provider-neutral visible-attachment download route with safe
      content-disposition, bounded path validation, and defensive response headers.
    - `globals.css` (`src/app/globals.css`): global Tailwind import, base document styles, and
      default plain-anchor color.
    - `layout.tsx` (`src/app/layout.tsx`): root document shell and metadata.
    - `page.tsx` (`src/app/page.tsx`): auth-aware root redirect to `/login` or `/workspace`.
  - `src/auth`: Resolvrr-native authentication helpers.
    - `current-user.ts` (`src/auth/current-user.ts`): server-only current-user lookup and protected
      route guard.
    - `password.ts` (`src/auth/password.ts`): Argon2id password hash and verify functions.
    - `repository.ts` (`src/auth/repository.ts`): auth persistence interface used by service logic.
    - `service.ts` (`src/auth/service.ts`): registration, login, current-session, logout, and
      expired-session cleanup use cases.
    - `session-cookie.ts` (`src/auth/session-cookie.ts`): secure session cookie options.
    - `session.ts` (`src/auth/session.ts`): raw session token generation, hashing, and expiry
      helpers.
    - `types.ts` (`src/auth/types.ts`): auth user, result, and session types.
    - `validation.ts` (`src/auth/validation.ts`): email/password input parsing and normalization.
  - `src/components`: reusable React component boundaries.
    - `src/components/ui`: shared UI primitives for buttons, dropdowns, menus, tables, tabs,
      tooltips, and recurring behavior.
      - `button.tsx` (`src/components/ui/button.tsx`): compact button primitive.
      - `checkbox.tsx` (`src/components/ui/checkbox.tsx`): labeled checkbox primitive.
      - `classnames.ts` (`src/components/ui/classnames.ts`): small class name composition helper.
      - `dropdown-navigation.ts` (`src/components/ui/dropdown-navigation.ts`): shared dropdown
        option navigation helpers.
      - `dropdown-select.tsx` (`src/components/ui/dropdown-select.tsx`): non-searchable
        single-select dropdown primitive.
      - `dropdown-styles.ts` (`src/components/ui/dropdown-styles.ts`): shared dropdown trigger,
        menu, measurement-layer, and row class contracts.
      - `dropdown-types.ts` (`src/components/ui/dropdown-types.ts`): shared dropdown option type.
      - `index.ts` (`src/components/ui/index.ts`): UI primitive exports.
      - `loading-state.tsx` (`src/components/ui/loading-state.tsx`): labeled compact loading state.
      - `menu-dropdown-measure.tsx` (`src/components/ui/menu-dropdown-measure.tsx`): hidden
        measurement shell for menu dropdown natural-width behavior.
      - `menu-dropdown.tsx` (`src/components/ui/menu-dropdown.tsx`): generic action menu primitive.
      - `menu-navigation.ts` (`src/components/ui/menu-navigation.ts`): shared menu item navigation
        and typeahead helpers.
      - `profile-menu.tsx` (`src/components/ui/profile-menu.tsx`): generic profile-style menu
        trigger and menu composition.
      - `searchable-dropdown-parts.tsx` (`src/components/ui/searchable-dropdown-parts.tsx`):
        searchable dropdown option filtering, hidden measurement, and row rendering helpers.
      - `searchable-dropdown.tsx` (`src/components/ui/searchable-dropdown.tsx`): searchable
        single-select dropdown primitive.
      - `spinner.tsx` (`src/components/ui/spinner.tsx`): standard loading spinner primitive.
      - `status-badge.tsx` (`src/components/ui/status-badge.tsx`): compact state badge primitive.
      - `table-header-cell.tsx` (`src/components/ui/table-header-cell.tsx`): sortable and resizable
        table header affordance primitive.
      - `table.tsx` (`src/components/ui/table.tsx`): shared table shell, header, row, and cell
        rhythm primitives.
      - `ticket-tab.tsx` (`src/components/ui/ticket-tab.tsx`): open-ticket tab primitive.
      - `toolbar-controls.tsx` (`src/components/ui/toolbar-controls.tsx`): compact toolbar wrappers
        over button and dropdown primitives.
      - `tooltip.tsx` (`src/components/ui/tooltip.tsx`): custom non-interactive tooltip primitive
        that opens on hover or keyboard-visible focus.
      - `use-outside-click.ts` (`src/components/ui/use-outside-click.ts`): shared outside-click
        close helper.
      - `use-table-sort.ts` (`src/components/ui/use-table-sort.ts`): shared sortable table state
        hook; row comparison stays in the owning feature.
  - `src/config`: typed runtime configuration.
    - `env.ts` (`src/config/env.ts`): Zod validation for required app, database, encryption,
      session, dev-origin, and runtime variables.
  - `src/core`: provider-neutral domain contracts and canonical values.
    - `helpdesk-connections.ts` (`src/core/helpdesk-connections.ts`): explicit helpdesk connection
      domain types.
    - `notifications.ts` (`src/core/notifications.ts`): notifications runtime module.
    - `providers.ts` (`src/core/providers.ts`): provider plugin contract, capability names, provider
      errors, and provider operation types.
    - `saved-view-condition-normalization.ts` (`src/core/saved-view-condition-normalization.ts`):
      saved view condition normalization runtime module.
    - `saved-view-types.ts` (`src/core/saved-view-types.ts`): type contracts for saved view.
    - `saved-views.ts` (`src/core/saved-views.ts`): provider-neutral saved view filters, conditions,
      query defaults, storage helpers, and metadata.
    - `ticket-list-query.ts` (`src/core/ticket-list-query.ts`): provider-neutral list query, sort,
      count, grouping, pagination, result contracts, and normalization.
    - `ticket-search.ts` (`src/core/ticket-search.ts`): provider-neutral interactive search
      length, control-character, whitespace, and advanced-syntax-preserving validation.
    - `ticket-lookups.ts` (`src/core/ticket-lookups.ts`): provider-neutral lookup option,
      contextual assignable-user input, lookup result, and request-scoped lookup cache-policy
      contracts.
    - `ticket-mentions.ts` (`src/core/ticket-mentions.ts`): provider-neutral group-scoped
      mention lookup input and option contracts.
    - `ticket-inline-images.ts` (`src/core/ticket-inline-images.ts`): provider-neutral inline raster
      locator, safe MIME, byte result, and same-origin route-path contracts.
    - `ticket-attachments.ts` (`src/core/ticket-attachments.ts`): provider-neutral visible-file
      locator, bounded byte result, and authenticated same-origin download-path contracts.
    - `ticket-article-content*.ts` (`src/core/ticket-article-content*.ts`): shared provider-neutral
      sanitized article quote/signature decision, parser-based structural analysis,
      containment-aware sibling-cluster and nested-envelope ranking, typed-hint validation and
      refinement, visible-message extraction, and disclosure contracts used by workspace
      rendering and outbound transcript assembly.
    - `ticket-article-signatures.ts` (`src/core/ticket-article-signatures.ts`): typed
      provider-neutral advisory marker, container-range, and learned-line signature hints whose
      offsets refer to final sanitized article HTML.
    - `ticket-conversation-history.ts` (`src/core/ticket-conversation-history.ts`):
      provider-neutral current/through-source history scope and opaque reviewed context contracts.
    - `ticket-replies.ts` (`src/core/ticket-replies.ts`): focused provider-neutral contextual
      reply intent, channel, recipient, article context, policy, and send-input contracts.
    - `ticket-forwards.ts` (`src/core/ticket-forwards.ts`): provider-neutral public-email forward
      context and reviewed forward input contracts.
    - `ticket-lifecycle.ts` (`src/core/ticket-lifecycle.ts`): observable, selectable, and mutable
      ticket state types plus provider-neutral merged replacement/retirement contracts.
    - `ticket-tab-import.ts` (`src/core/ticket-tab-import.ts`): provider-neutral ordered,
      read-only ticket-tab import snapshot contract.
    - `ticket-signatures.ts` (`src/core/ticket-signatures.ts`): provider-neutral signature source,
      reviewed context, provider request/result, and resolved signature contracts.
    - `tickets.ts` (`src/core/tickets.ts`): canonical ticket values and provider-neutral
      ticket/thread/link/subscription/mutation/communication types.
  - `src/data`: server-only database access boundaries.
    - `ai-prompts-repository.ts` (`src/data/ai-prompts-repository.ts`):
      Prisma-backed encrypted workspace AI prompt default repository.
    - `ai-rephrase-styles-repository.ts` (`src/data/ai-rephrase-styles-repository.ts`):
      Prisma-backed encrypted workspace rephrase style and personal style override repository.
    - `ai-settings-repository.ts` (`src/data/ai-settings-repository.ts`):
      Prisma-backed encrypted workspace/per-user AI settings and workspace-level AI user
      permission default repository.
    - `ai-summary-cache-repository.ts` (`src/data/ai-summary-cache-repository.ts`):
      Prisma-backed encrypted, fingerprint-valid selected-ticket AI summary cache repository;
      exact identity matches remain reusable regardless of age.
    - `auth-repository.ts` (`src/data/auth-repository.ts`): Prisma-backed auth repository.
    - `helpdesk-connections-repository.ts` (`src/data/helpdesk-connections-repository.ts`):
      Prisma-backed helpdesk connection, workspace membership, seeded rephrase style, and active
      connection preference persistence repository.
    - `helpdesk-connections-repository-mappers.ts`
      (`src/data/helpdesk-connections-repository-mappers.ts`): helpdesk connection status,
      storage/domain mapping, and workspace membership access lookup helpers.
    - `my-style-repository.ts` (`src/data/my-style-repository.ts`): Prisma-backed encrypted
      per-user/per-workspace My Style repository.
    - `prisma.ts` (`src/data/prisma.ts`): Prisma Client singleton with PostgreSQL driver adapter.
    - `saved-views-repository-mappers.ts` (`src/data/saved-views-repository-mappers.ts`): saved
      views repository mappers runtime module.
    - `saved-views-repository.ts` (`src/data/saved-views-repository.ts`): Prisma-backed saved
      view/preference repository and seeded-view dismissal persistence.
    - `saved-view-selection-repository.ts` (`src/data/saved-view-selection-repository.ts`):
      Prisma-backed per-user/per-workspace active saved-view UI preference repository.
    - `ticket-detail-cache-repository.ts` (`src/data/ticket-detail-cache-repository.ts`):
      Prisma-backed selected-ticket detail cache repository that encrypts normalized detail/thread
      payloads and keeps cache identity/freshness metadata scoped to user and connection.
    - `user-management-repository.ts` (`src/data/user-management-repository.ts`): Prisma-backed
      admin user-management repository for listing users, workspace memberships, password reset,
      owner transfer, hard delete, and deactivate/scrub workflows.
    - `workspace-tabs-repository.ts` (`src/data/workspace-tabs-repository.ts`): Prisma-backed user
      and active helpdesk-connection scoped `UiPreference` repository for persisted workspace open
      tabs.
  - `src/features`: product feature boundaries that compose core contracts into workflows.
    - `src/features/ai`: provider-neutral AI Assistant runtime feature boundary, currently
      including selected-ticket summaries, AI settings, Prompt Center, My Style, proofread/rephrase
      draft assistance, provider validation, and generated-summary cache integration.
      - `draft-rewrite-actions.ts` (`src/features/ai/draft-rewrite-actions.ts`):
        authenticated server action for proofread/rephrase draft assistance over active-workspace AI
        settings, registered prompts, selected rephrase styles, and workspace-scoped My Style.
      - `draft-rewrite-model.ts` (`src/features/ai/draft-rewrite-model.ts`): provider-neutral
        proofread/rephrase request, selected-style, unavailable-state, and action result types.
      - `draft-rewrite-service.ts` (`src/features/ai/draft-rewrite-service.ts`): draft-only
        proofread/rephrase prompt construction and AI text generation orchestration.
      - `index.ts` (`src/features/ai/index.ts`): AI feature exports.
      - `model.ts` (`src/features/ai/model.ts`): read-only selected-ticket AI summary request,
        result, unavailable-state, and action types.
      - `my-style-actions.ts` (`src/features/ai/my-style-actions.ts`): authenticated server actions
        for loading, saving, and resetting the current user's My Style.
      - `my-style-model.ts` (`src/features/ai/my-style-model.ts`): structured My Style fields,
        action result codes, and action types.
      - `my-style-repository.ts` (`src/features/ai/my-style-repository.ts`): provider-neutral
        per-user/per-workspace encrypted My Style persistence contract.
      - `my-style-service.ts` (`src/features/ai/my-style-service.ts`): My Style normalization,
        length validation, encryption, loading, saving, and reset orchestration.
      - `prompt-actions.ts` (`src/features/ai/prompt-actions.ts`): authenticated server actions for
        loading Prompt Center data, saving/resetting prompt defaults, and managing workspace
        rephrase styles and personal style overrides.
      - `prompt-mutation-context.ts` (`src/features/ai/prompt-mutation-context.ts`): shared active
        workspace and Prompt Center reload context for prompt and style mutation services.
      - `prompt-model.ts` (`src/features/ai/prompt-model.ts`): serializable Prompt Center data,
        prompt/editor-semantics view models, action codes, and action types.
      - `prompt-mutation-service.ts` (`src/features/ai/prompt-mutation-service.ts`): prompt save,
        reset, rephrase style CRUD, personal style override orchestration, admin/user gating,
        encryption, and summary-cache invalidation scoped to summary guidance changes.
      - `prompt-registry.ts` (`src/features/ai/prompt-registry.ts`): registered AI prompt keys,
        defaults, editability, complete-prompt versus supplemental-guidance editor semantics,
        read-only contract descriptions, and maximum-length metadata.
      - `prompt-repository.ts` (`src/features/ai/prompt-repository.ts`): provider-neutral prompt
        persistence contract for encrypted workspace defaults.
      - `prompt-service.ts` (`src/features/ai/prompt-service.ts`): Prompt Center loading and
        effective prompt resolution for workspace defaults and built-in fallbacks.
      - `rephrase-style-defaults.ts` (`src/features/ai/rephrase-style-defaults.ts`): built-in
        workspace rephrase style seed definitions.
      - `rephrase-style-mutation-service.ts`
        (`src/features/ai/rephrase-style-mutation-service.ts`): workspace rephrase style CRUD and
        personal style override mutation orchestration.
      - `rephrase-style-model.ts` (`src/features/ai/rephrase-style-model.ts`): serializable
        rephrase style option, admin view, personal override view, and effective style types.
      - `rephrase-style-repository.ts` (`src/features/ai/rephrase-style-repository.ts`):
        provider-neutral workspace rephrase style and personal override persistence contract.
      - `rephrase-style-service.ts` (`src/features/ai/rephrase-style-service.ts`): rephrase style
        listing, prompt decryption, effective style resolution, validation, and permission helpers.
      - `provider-config.ts` (`src/features/ai/provider-config.ts`): provider-neutral runtime AI
        provider configuration result types, including the optional opaque configuration version.
      - `provider-error-metadata.ts` (`src/features/ai/provider-error-metadata.ts`): extracts only
        bounded provider error code/type tokens from opt-in error JSON for metadata-only telemetry.
      - `settings-actions.ts` (`src/features/ai/settings-actions.ts`): authenticated server actions
        for loading and saving active-workspace AI settings.
      - `settings-form.ts` (`src/features/ai/settings-form.ts`): FormData parsing and HTTPS base URL
        validation for workspace and user AI settings.
      - `settings-live-validation.ts` (`src/features/ai/settings-live-validation.ts`): safe live AI
        provider validation request wrapper used before settings persistence.
      - `settings-model.ts` (`src/features/ai/settings-model.ts`): provider-neutral serializable AI
        settings data, policy, protocol, action, and result types.
      - `settings-mutation-service.ts` (`src/features/ai/settings-mutation-service.ts`):
        workspace/user AI settings save orchestration, admin gating, blank-secret preservation, and
        generated-summary cache invalidation.
      - `settings-repository.ts` (`src/features/ai/settings-repository.ts`): provider-neutral AI
        settings persistence contract and stored config shapes.
      - `settings-service.ts` (`src/features/ai/settings-service.ts`): active-workspace AI settings
        loading, runtime resolution, decrypted config handling, and validation helpers.
      - `summary-cache-invalidation.ts` (`src/features/ai/summary-cache-invalidation.ts`):
        best-effort generated-summary cache invalidation helpers for ticket, connection, and
        workspace AI settings changes.
      - `summary-cache-key.ts` (`src/features/ai/summary-cache-key.ts`): prompt/model/source
        fingerprint key builder for generated-summary cache entries.
      - `summary-cache-repository.ts` (`src/features/ai/summary-cache-repository.ts`):
        provider-neutral generated-summary cache repository contract and disabled no-op repository.
      - `ticket-summary-cache.ts` (`src/features/ai/ticket-summary-cache.ts`): generated-summary
        cache read/write helpers plus cache-only selected-ticket summary hydration.
      - `ticket-summary-content.ts` (`src/features/ai/ticket-summary-content.ts`):
        client-safe structured summary type and current plain-text paragraph projection.
      - `text-generation.ts` (`src/features/ai/text-generation.ts`): OpenAI-compatible Chat
        Completions and Anthropic-compatible Messages HTTP adapters for single text generation
        requests, with pinned-address provider HTTP, safe error mapping, truncation rejection, and
        no prompt/output logging.
      - `text-generation-errors.ts` (`src/features/ai/text-generation-errors.ts`): provider-neutral
        AI HTTP status classification that distinguishes authentication from request rejection.
      - `text-generation-response.ts` (`src/features/ai/text-generation-response.ts`): focused
        provider-response text extraction and token-limit truncation detection.
      - `ticket-summary-actions.ts` (`src/features/ai/ticket-summary-actions.ts`): authenticated
        server action that validates the originating workspace/personal connection, reloads
        selected-ticket detail, and performs one controlled auth-recovery retry.
      - `ticket-summary-context.ts` (`src/features/ai/ticket-summary-context.ts`): prompt-context
        builder that converts provider-neutral ticket detail and sanitized article HTML into
        bounded plain text.
      - `ticket-summary-hydration.ts` (`src/features/ai/ticket-summary-hydration.ts`): server-side
        selected-ticket summary cache hydration for coordinated detail loads without AI
        generation.
      - `ticket-summary-service.ts` (`src/features/ai/ticket-summary-service.ts`): read-only
        selected-ticket summary orchestration over AI runtime config and prompt context, including
        one bounded structured-output repair attempt.
      - `ticket-summary-structure.ts` (`src/features/ai/ticket-summary-structure.ts`): immutable
        provider-neutral summary schema instruction, strict server parsing, sanitization,
        normalization, chronological validation, and encrypted cache serialization.
    - `src/features/auth`: auth server actions and form messages.
      - `actions.ts` (`src/features/auth/actions.ts`): login, register, and logout server actions.
      - `index.ts` (`src/features/auth/index.ts`): auth feature exports.
      - `messages.ts` (`src/features/auth/messages.ts`): auth form error message helpers.
    - `src/features/helpdesk-connections`: provider-neutral shared-workspace and personal
      helpdesk-connection management feature.
      - `actions.ts` (`src/features/helpdesk-connections/actions.ts`): server actions for connection
        create, update, validate, enable/disable, active selection, and local delete.
      - `form-parsing.ts` (`src/features/helpdesk-connections/form-parsing.ts`): provider-neutral
        connection form parsing and blank credential preservation rules.
      - `index.ts` (`src/features/helpdesk-connections/index.ts`): helpdesk connection feature
        exports.
      - `messages.ts` (`src/features/helpdesk-connections/messages.ts`): user-safe connection action
        messages.
      - `provider-validation.ts` (`src/features/helpdesk-connections/provider-validation.ts`):
        connection validation helper that combines SSRF validation with provider validation, safe
        failure messages, and metadata-only diagnostics.
      - `repository.ts` (`src/features/helpdesk-connections/repository.ts`): shared Workspace,
        per-user HelpdeskConnection, owner-only credential persistence, and active-workspace
        preference contracts.
      - `service-listing.ts` (`src/features/helpdesk-connections/service-listing.ts`): connection
        provider option, list, and edit-read use cases.
      - `service-types.ts` (`src/features/helpdesk-connections/service-types.ts`): provider option,
        connection list item, and mutation result shapes.
      - `service.ts` (`src/features/helpdesk-connections/service.ts`): workspace and personal
        connection mutation use cases for credential isolation, provider identity binding,
        duplicate-identity rejection, URL replacement, SSRF validation, and provider validation.
    - `src/features/user-management`: admin-only global user and workspace-access management
      feature.
      - `actions.ts` (`src/features/user-management/actions.ts`): authenticated server actions for
        loading user-management data, saving users, resetting passwords, and delete/deactivate.
      - `index.ts` (`src/features/user-management/index.ts`): user-management feature exports.
      - `model.ts` (`src/features/user-management/model.ts`): serializable user-management data,
        mutation request, action result, and action function types.
      - `repository.ts` (`src/features/user-management/repository.ts`): provider-neutral
        user-management persistence contract.
      - `service.ts` (`src/features/user-management/service.ts`): admin gating, create/update,
        password reset, owner transfer, hard-delete, and deactivate/scrub orchestration.
      - `validation.ts` (`src/features/user-management/validation.ts`): request parsing for user
        save, password reset, and delete/deactivate actions.
    - `src/features/notifications`: provider-neutral workspace notification feature.
      - `actions.ts` (`src/features/notifications/actions.ts`): actions feature module.
      - `index.ts` (`src/features/notifications/index.ts`): index feature module.
      - `model.ts` (`src/features/notifications/model.ts`): model feature module.
      - `service.ts` (`src/features/notifications/service.ts`): service feature module.
    - `src/features/saved-views`: saved view query, settings, and workspace orchestration feature.
      - `actions.ts` (`src/features/saved-views/actions.ts`): server actions for non-redirecting
        workspace saved-view Settings mutations and lookup-backed settings data.
      - `conditions.ts` (`src/features/saved-views/conditions.ts`): provider-neutral condition
        validation, `My work` seed conditions, and query compilation.
      - `index.ts` (`src/features/saved-views/index.ts`): saved view feature boundary.
      - `lucide-icon-names.ts` (`src/features/saved-views/lucide-icon-names.ts`): curated and
        normalized Lucide icon-name validation for saved-view appearance.
      - `manage-service.ts` (`src/features/saved-views/manage-service.ts`): manage service feature
        module.
      - `owner-group-compatibility.ts`
        (`src/features/saved-views/owner-group-compatibility.ts`): positive-group scope derivation
        and fail-closed owner-access validation shared by the View editor and server action.
      - `query-service.ts` (`src/features/saved-views/query-service.ts`): query service feature
        module.
      - `repository.ts` (`src/features/saved-views/repository.ts`): saved view repository contract
        and stored view/preference shapes.
      - `selection-actions.ts` (`src/features/saved-views/selection-actions.ts`): validates and
        persists the current user's active workspace saved-view selection.
      - `selection-preference.ts` (`src/features/saved-views/selection-preference.ts`): versioned,
        provider-neutral selected-view UI preference contract and storage normalization.
      - `service-types.ts` (`src/features/saved-views/service-types.ts`): type contracts for
        service.
      - `service.ts` (`src/features/saved-views/service.ts`): saved view query sanitization,
        guardrails, seed/default handling, and create/update/delete/reorder use cases.
      - `settings-model.ts` (`src/features/saved-views/settings-model.ts`): serializable Settings
        Views data and action result contracts.
      - `workspace.ts` (`src/features/saved-views/workspace.ts`): workspace saved-view option
        mapping, unsupported-view flagging, and persisted-selection fallback rules.
    - `src/features/settings`: settings feature boundary.
      - `index.ts` (`src/features/settings/index.ts`): settings feature boundary.
    - `src/features/signatures`: workspace signature policy, encrypted template management,
      variable rendering, preview actions, and stale-context revalidation.
    - `src/features/tickets`: provider-neutral ticket read, lookup, metadata mutation,
      communication, and adapter workflows.
      - `actions.ts` (`src/features/tickets/actions.ts`): server-action entrypoint for staged
        selected-ticket updates plus workspace list, global search, and link-target reads.
      - `cache-repository.ts` (`src/features/tickets/cache-repository.ts`): provider-neutral
        selected-ticket detail cache repository contract and no-cache implementation.
      - `communication-action-input.ts` (`src/features/tickets/communication-action-input.ts`):
        server-side parser and validation for selected-ticket internal-note and customer-reply
        submit payloads.
      - `communication-actions.ts` (`src/features/tickets/communication-actions.ts`): standalone
        server actions for selected-ticket internal-note and customer-reply submits. The production
        workspace currently stages these writes through the shared selected-ticket `Update` action
        instead.
      - `communication-body.ts` (`src/features/tickets/communication-body.ts`): communication body
        feature module.
      - `communication-dispatch.ts` (`src/features/tickets/communication-dispatch.ts`):
        capability-gated internal-note/customer-reply/customer-forward provider dispatch plus
        provider error mapping.
      - `communication-model.ts` (`src/features/tickets/communication-model.ts`): provider-neutral
        communication payload, capability, result, and action-state types.
      - `communication-service.ts` (`src/features/tickets/communication-service.ts`): communication
        write orchestration with selected-ticket detail refresh-after-write checks and metadata-only
        communication outcome audit logs.
      - `communication-service-audit.ts` (`src/features/tickets/communication-service-audit.ts`):
        shared metadata-only communication audit context and outcome helpers.
      - `forward-input.ts` (`src/features/tickets/forward-input.ts`): strict provider-neutral
        subject, recipient, attachment-ID, and forward-context input validation.
      - `mutation-action-results.ts` (`src/features/tickets/mutation-action-results.ts`): shared
        selected-ticket metadata and communication action result messages.
      - `connection-context.ts` (`src/features/tickets/connection-context.ts`): active connection
        or explicit signed-in-user personal connection lookup, credential decryption, provider
        lookup, base URL revalidation, and setup timing for ticket reads and metadata mutations.
      - `inline-image-service.ts` (`src/features/tickets/inline-image-service.ts`): authenticated
        provider-neutral inline-image capability dispatch using the article's explicit connection.
      - `attachment-service.ts` (`src/features/tickets/attachment-service.ts`): authenticated
        provider-neutral visible-attachment capability dispatch using the article's explicit
        personal connection.
      - `date-time-format.ts` (`src/features/tickets/date-time-format.ts`): shared workspace
        date/time formatter for provider-backed ticket table, detail, thread, and metadata display
        strings.
      - `detail-action-result.ts` (`src/features/tickets/detail-action-result.ts`): client-safe
        workspace ticket detail action result and loader action function types.
      - `detail-actions.ts` (`src/features/tickets/detail-actions.ts`): authenticated server action
        for post-hydration workspace detail loads. It returns adapted final detail, merged-source
        retirement, or provider-neutral unavailable state.
      - `detail-resolution-service.ts` (`src/features/tickets/detail-resolution-service.ts`):
        bounded, cycle-safe merged replacement traversal with source invalidation and final-target
        cache ownership.
      - `index.ts` (`src/features/tickets/index.ts`): ticket workflow feature boundary. It does not
        export server actions so component/test imports do not pull in env or database modules.
      - `link-target-actions.ts` (`src/features/tickets/link-target-actions.ts`): authenticated
        server action for Add link modal target search, passing provider-neutral query and customer
        filters and returning unavailable state or link target summaries.
      - `link-target-search-action-result.ts`
        (`src/features/tickets/link-target-search-action-result.ts`): client-safe Add link target
        search request/result and action function types, including the optional provider-neutral
        customer external ID filter.
      - `link-target-service.ts` (`src/features/tickets/link-target-service.ts`): provider-neutral
        Add link target search orchestration, capability-gated provider dispatch, and provider-error
        mapping.
      - `list-actions.ts` (`src/features/tickets/list-actions.ts`): authenticated server action for
        post-hydration ungrouped workspace list page loads. It returns adapted workspace rows and
        provider-neutral pagination metadata only.
      - `list-page-action-result.ts` (`src/features/tickets/list-page-action-result.ts`):
        client-safe workspace ticket list page action result and loader action function types.
      - `list-page-sizes.ts` (`src/features/tickets/list-page-sizes.ts`):
        provider-neutral workload, grouped-bucket, and quick-search page-size policy.
      - `list-query-guardrails.ts` (`src/features/tickets/list-query-guardrails.ts`):
        provider-neutral list query capability derivation and guardrail checks for unsupported or
        expensive query requests before provider dispatch.
      - `search-action-result.ts` (`src/features/tickets/search-action-result.ts`): client-safe
        quick/detailed global ticket search request, result, paging, and sort contracts.
      - `search-actions.ts` (`src/features/tickets/search-actions.ts`): authenticated global ticket
        search action using the signed-in user's active personal connection and the shared ticket
        list read boundary.
      - `workspace-list-sort.ts` (`src/features/tickets/workspace-list-sort.ts`): shared
        provider-neutral workspace/list sort translation and complete-result relationship-sort
        guardrails.
      - `lookup-actions.ts` (`src/features/tickets/lookup-actions.ts`): authenticated, strictly
        normalized contextual assignable-owner and mentionable-agent server actions.
      - `metadata-action-input-values.ts` (`src/features/tickets/metadata-action-input-values.ts`):
        metadata action input values feature module.
      - `metadata-action-input.ts` (`src/features/tickets/metadata-action-input.ts`): server-side
        parser and validation for one selected-ticket update payload per explicit `Update`,
        including communication, tag, link relation, subscription, pending-date, and raw provider
        field validation.
      - `update-communication-action-input.ts`
        (`src/features/tickets/update-communication-action-input.ts`): strict discriminated
        internal-comment/customer-reply parser and rich-body sanitizer for the shared Update.
      - `metadata-mutation-service.ts` (`src/features/tickets/metadata-mutation-service.ts`):
        provider-neutral selected-ticket metadata mutation orchestration with optional deferred
        finalization for combined Updates.
      - `mutation-finalization-service.ts`
        (`src/features/tickets/mutation-finalization-service.ts`): shared one-pass post-Update cache
        invalidation and coordinated provider detail/list refresh.
      - `mutation-model.ts` (`src/features/tickets/mutation-model.ts`): provider-neutral metadata
        mutation capabilities, selected-ticket update payload shape, allowed update payload/slice
        keys, pending-date validation, result/error model, and action state types.
      - `provider-dispatch.ts` (`src/features/tickets/provider-dispatch.ts`): capability-gated
        ticket read and metadata mutation dispatch plus provider error to unavailable-state mapping.
      - `provider-lookup-dispatch.ts` (`src/features/tickets/provider-lookup-dispatch.ts`): provider
        lookup dispatch feature module.
      - `ticket-lookup-service.ts` (`src/features/tickets/ticket-lookup-service.ts`): capability-
        gated contextual owner, mentionable-agent, and supporting ticket lookup coordination.
      - `read-model.ts` (`src/features/tickets/read-model.ts`): provider-neutral ticket read result,
        unavailable-state, metadata mutation and communication capability exposure, and default list
        query types.
      - `reply-input.ts` (`src/features/tickets/reply-input.ts`): strict provider-neutral email
        normalization, cross-field deduplication, reply intent, and contextual send validation.
      - `service-cache.ts` (`src/features/tickets/service-cache.ts`): metadata-only cache read,
        write, and invalidation timing wrappers used by ticket read and mutation orchestration.
      - `service-list-query.ts` (`src/features/tickets/service-list-query.ts`): ticket list query
        helper that requests counts only when the provider advertises count support.
      - `service.ts` (`src/features/tickets/service.ts`): thin ticket read orchestration and
        selected-ticket detail cache hit/write-through integration.
      - `workspace-adapter-types.ts` (`src/features/tickets/workspace-adapter-types.ts`): type
        contracts for workspace adapter.
      - `workspace-adapter.ts` (`src/features/tickets/workspace-adapter.ts`): canonical
        ticket/detail to workspace render model adapter, including formatted and ISO pending-time
        values for selected-ticket metadata drafts.
    - `src/features/tab-import`: provider-neutral, explicit ticket-tab import workflow.
      - `actions.ts` (`src/features/tab-import/actions.ts`): authenticated import and
        connection/workspace/identity-scoped detail-hydration actions.
      - `model.ts` (`src/features/tab-import/model.ts`): serializable import result contracts.
      - `service.ts` (`src/features/tab-import/service.ts`): ownership-safe read orchestration,
        capability checks, safe diagnostics, and provider error mapping.
    - `src/features/workspace`: workspace feature entrypoint, actions, and client-side state
      boundaries.
      - `src/features/workspace/components`: workspace UI composition and local client state
        modules.
        - `src/features/workspace/components/ticket-tabs`: ticket tab layout, drag, and
          rendering modules.
          - `drag-announcement.ts`
            (`src/features/workspace/components/ticket-tabs/drag-announcement.ts`): drag
            announcement workspace helper module.
          - `drag-geometry.ts` (`src/features/workspace/components/ticket-tabs/drag-geometry.ts`):
            drag geometry workspace helper module.
          - `horizontal-ticket-tabs.tsx`
            (`src/features/workspace/components/ticket-tabs/horizontal-ticket-tabs.tsx`): horizontal
            ticket tabs workspace UI component.
          - `tab-item.tsx` (`src/features/workspace/components/ticket-tabs/tab-item.tsx`): tab item
            workspace UI component.
          - `use-draggable-ticket-tabs.ts`
            (`src/features/workspace/components/ticket-tabs/use-draggable-ticket-tabs.ts`): use
            draggable ticket tabs workspace helper module.
          - `vertical-ticket-tabs.tsx`
            (`src/features/workspace/components/ticket-tabs/vertical-ticket-tabs.tsx`): vertical
            ticket tabs workspace UI component.
        - `communication-draft-factory.ts`
          (`src/features/workspace/components/communication-draft-factory.ts`): builds contextual
          reply/forward drafts and identifies the newest eligible footer sources.
        - `communication-draft-replacement-dialog.tsx`
          (`src/features/workspace/components/communication-draft-replacement-dialog.tsx`):
          focus-managed shared confirmation dialog for replacing dirty communication drafts.
        - `communication-draft.ts` (`src/features/workspace/components/communication-draft.ts`):
          communication draft copying, body, recipient-edit, and replacement-confirmation helpers.
        - `metadata-draft-payload.ts`
          (`src/features/workspace/components/metadata-draft-payload.ts`): constructs one strict
          metadata plus discriminated communication Update payload.
        - `metadata-draft-types.ts` (`src/features/workspace/components/metadata-draft-types.ts`):
          selected-ticket metadata and single communication draft contracts.
        - `metadata-draft.ts` (`src/features/workspace/components/metadata-draft.ts`):
          selected-ticket draft shell plus metadata-slice diffing, validation, dirty-field
          detection, reset, explicitly enabled editable-slice guardrail, and structured
          update-payload construction helpers for primary and secondary metadata.
        - `post-update-navigation-selector.tsx`
          (`src/features/workspace/components/post-update-navigation-selector.tsx`): compact
          workspace selector for the persisted post-Update navigation preference.
        - `post-update-navigation.ts`
          (`src/features/workspace/components/post-update-navigation.ts`): provider-neutral
          post-Update navigation values, localStorage helpers, and final-state navigation decision
          helper.
        - `ticket-add-link-customer-section.tsx`
          (`src/features/workspace/components/ticket-add-link-customer-section.tsx`): ticket add
          link customer section workspace UI component.
        - `ticket-add-link-dialog-types.ts`
          (`src/features/workspace/components/ticket-add-link-dialog-types.ts`): type contracts for
          ticket add link dialog.
        - `ticket-add-link-dialog.tsx`
          (`src/features/workspace/components/ticket-add-link-dialog.tsx`): workspace-local Add
          link modal for searching/staging one ticket link target and relation kind without provider
          writes, including same-customer and session-recent candidate sections.
        - `ticket-add-link-manual-field.tsx`
          (`src/features/workspace/components/ticket-add-link-manual-field.tsx`): ticket add link
          manual field workspace UI component.
        - `ticket-add-link-relation-options.tsx`
          (`src/features/workspace/components/ticket-add-link-relation-options.tsx`): Add link modal
          relation radio choices with Parent/Child disabled when unsupported.
        - `ticket-add-link-search-results.tsx`
          (`src/features/workspace/components/ticket-add-link-search-results.tsx`): compact Add link
          modal candidate/result list and unavailable/empty/searching states.
        - `ticket-ai-summary-panel.tsx`
          (`src/features/workspace/components/ticket-ai-summary-panel.tsx`): selected-ticket AI
          Assistant operational brief with structured Situation, chronological Timeline, optional
          Next Risk, and generation only from an explicit user action.
        - `ticket-article-attachments.tsx`
          (`src/features/workspace/components/ticket-article-attachments.tsx`): article attachment
          metadata presentation and keyboard-accessible authenticated download links. It displays
          provider-neutral filename, content type, and byte size without exposing provider URLs.
        - `ticket-article-body-trim.ts`
          (`src/features/workspace/components/ticket-article-body-trim.ts`): compatibility export
          for the shared core article-content trimmer used by the article body renderer.
        - `ticket-article-body.tsx`
          (`src/features/workspace/components/ticket-article-body.tsx`): sanitized article HTML
          renderer with responsive images, neutral email-layout tables, horizontal overflow
          containment, and collapsed quote/signature disclosure.
        - `ticket-assignment-fields.tsx`
          (`src/features/workspace/components/ticket-assignment-fields.tsx`): owner/group assignment
          sidebar controls with group-dependent full-access owner lookup and staged compatibility
          feedback.
        - `ticket-column-visibility-action.tsx`
          (`src/features/workspace/components/ticket-column-visibility-action.tsx`): reusable column
          visibility menu used by the list toolbar.
        - `ticket-detail-loading-shell.tsx`
          (`src/features/workspace/components/ticket-detail-loading-shell.tsx`): ticket detail
          loading shell workspace UI component.
        - `ticket-detail-header.tsx`
          (`src/features/workspace/components/ticket-detail-header.tsx`): selected-ticket header
          with priority, state, customer identity, ticket link, refresh, and summary controls that
          preserve generated results in the client detail cache.
        - `ticket-detail-sidebar.tsx`
          (`src/features/workspace/components/ticket-detail-sidebar.tsx`): production metadata
          sidebar shell for selected-ticket subscription, tags, links, and editor-provided metadata
          controls.
        - `ticket-detail.tsx` (`src/features/workspace/components/ticket-detail.tsx`): production
          selected-ticket detail composition around the metadata editor and detail header.
        - `ticket-inline-communication-composer.tsx`
          (`src/features/workspace/components/ticket-inline-communication-composer.tsx`):
          ticket-level Reply/Forward/Comment rich-text composer above the newest article. It
          keeps outbound signature previews visually inside the editor shell but read-only and
          separate from the authored body, composes the optional reply-history footer, stages text
          in the selected-ticket draft, exposes
          draft-only proofread/rephrase controls, and has no local Send/Cancel footer.
        - `ticket-ai-editor-toolbar.tsx`
          (`src/features/workspace/components/ticket-ai-editor-toolbar.tsx`): right-aligned
          Proofread, configured-style Rephrase menu, and inert AI Reply placeholder for the
          ticket communication editor.
        - `ticket-ai-draft-suggestions.ts`
          (`src/features/workspace/components/ticket-ai-draft-suggestions.ts`): suggestion labels,
          safe full-draft HTML conversion, and editor-to-server rewrite target mapping.
        - `use-ticket-mention-suggestions.tsx`
          (`src/features/workspace/components/use-ticket-mention-suggestions.tsx`):
          staged-group-aware `@@` detection, debounced mention lookup, accessible option
          navigation, and provider-neutral non-editable mention insertion.
        - `ticket-signature-preview.tsx` and `use-ticket-signature-preview.ts`: exact reviewed
          signature preview, collapsed-by-default accessible read-only editor footer, group-change
          refresh, retry state, and Update readiness coordination.
        - `workspace-settings-signatures-section.tsx`: admin signature-source selection and
          Resolvrr default/group template editor with safe variables and bounded images.
        - `ticket-communication-draft-persistence.ts`
          (`src/features/workspace/components/ticket-communication-draft-persistence.ts`):
          versioned identity-scoped local communication record serialization and durable browser
          recovery operations.
        - `ticket-communication-draft-indexeddb.ts`
          (`src/features/workspace/components/ticket-communication-draft-indexeddb.ts`): focused
          IndexedDB v9 shared connection, serialized transaction, and storage-error boundary.
        - `communication-draft-serialization.ts`
          (`src/features/workspace/components/communication-draft-serialization.ts`): maps the
          complete workspace communication draft to browser persistence.
        - `workspace-communication-draft-controller.ts`
          (`src/features/workspace/components/workspace-communication-draft-controller.ts`):
          workspace-lifetime registry, load deduplication, coalesced memory-first persistence,
          lifecycle flushing, and synchronous confirmed-send cleanup across ticket mounts.
        - `workspace-communication-draft-context.tsx`
          (`src/features/workspace/components/workspace-communication-draft-context.tsx`):
          controller context and per-ticket external-store subscription.
        - `workspace-communication-draft-boundary.tsx`
          (`src/features/workspace/components/workspace-communication-draft-boundary.tsx`):
          complete personal identity scope construction and workspace controller provider.
        - `communication-draft-storage-status.tsx`
          (`src/features/workspace/components/communication-draft-storage-status.tsx`): local
          browser recovery and storage-unavailable status.
        - `communication-draft-close-dialog.tsx`
          (`src/features/workspace/components/communication-draft-close-dialog.tsx`): explicit
          Cancel, Keep draft & close, and Discard & close confirmation surface.
        - `use-communication-draft-close-guard.tsx`
          (`src/features/workspace/components/use-communication-draft-close-guard.tsx`):
          draft-aware local tab-close coordination.
        - `use-clear-communication-draft.ts`
          (`src/features/workspace/components/use-clear-communication-draft.ts`): controller-first
          confirmed communication cleanup with no-controller storage fallback.
        - `ticket-communication-draft-restore.ts`
          (`src/features/workspace/components/ticket-communication-draft-restore.ts`): restores
          versioned communication drafts only against fresh reply or forward article contexts.
        - `ticket-forward-options.tsx`
          (`src/features/workspace/components/ticket-forward-options.tsx`): editable forward
          subject and source-attachment selection in the shared full-width composer inset.
        - `ticket-conversation-history.tsx`
          (`src/features/workspace/components/ticket-conversation-history.tsx`): shared default-on
          Reply/Forward include control plus source-bounded or current, collapsed, read-only
          public transcript preview inside the editor.
        - `use-communication-draft-scope.ts`
          (`src/features/workspace/components/use-communication-draft-scope.ts`): stable user,
          workspace, and final-ticket IndexedDB communication draft scope.
        - `ticket-list-pager-rows.ts`
          (`src/features/workspace/components/ticket-list-pager-rows.ts`): list pager request,
          identity, row append, and refreshed-baseline merge helpers.
        - `ticket-list-first-page-load.ts`
          (`src/features/workspace/components/ticket-list-first-page-load.ts`): safe first-page and
          generic list-page action wrappers used by the workspace pager.
        - `ticket-list-pager-complete-values.ts`
          (`src/features/workspace/components/ticket-list-pager-complete-values.ts`): derives the
          active rows, counts, and incremental-window controls for complete-result display sorts.
        - `ticket-list-authoritative-refresh.ts`
          (`src/features/workspace/components/ticket-list-authoritative-refresh.ts`): replaces
          stale saved-view rows through one coordinated provider refresh while re-fetching every
          ungrouped page and independently expanded group page already loaded by the user.
        - `ticket-list-pager-types.ts`
          (`src/features/workspace/components/ticket-list-pager-types.ts`): list pager hook prop
          type boundary.
        - `ticket-list-toolbar.tsx` (`src/features/workspace/components/ticket-list-toolbar.tsx`):
          list-only toolbar for Select all, Refresh, the disabled Bulk actions placeholder, saved
          view selection, grouping, and column visibility above the ticket table.
        - `ticket-lookup-options.tsx`
          (`src/features/workspace/components/ticket-lookup-options.tsx`): compact read-only
          provider-neutral lookup option list rendering for selected-ticket sidebar fields.
        - `ticket-metadata-action-bar.tsx`
          (`src/features/workspace/components/ticket-metadata-action-bar.tsx`): sticky full-width
          action row with Reply/Reply all/Comment on the left and Discard, navigation, and Update
          on the right.
        - `ticket-metadata-editor-sidebar.tsx`
          (`src/features/workspace/components/ticket-metadata-editor-sidebar.tsx`): focused metadata
          sidebar field and validation/status composition extracted from editor state.
        - `ticket-metadata-editor-state-types.ts`
          (`src/features/workspace/components/ticket-metadata-editor-state-types.ts`): type
          contracts for ticket metadata editor state.
        - `ticket-metadata-editor-state.tsx`
          (`src/features/workspace/components/ticket-metadata-editor-state.tsx`): stateful
          selected-ticket draft editor implementation used by the thin editor wrapper.
        - `ticket-metadata-editor-submit.ts`
          (`src/features/workspace/components/ticket-metadata-editor-submit.ts`): ticket metadata
          editor submit workspace helper module.
        - `ticket-metadata-editor.tsx`
          (`src/features/workspace/components/ticket-metadata-editor.tsx`): selected-ticket draft
          editor for state, priority, owner, group, secondary metadata, pending date/time, Update,
          Discard changes, pending/error states, and changed-field treatment.
        - `ticket-pending-date-time-selector-utils.ts`
          (`src/features/workspace/components/ticket-pending-date-time-selector-utils.ts`): ticket
          pending date time selector utils workspace helper module.
        - `ticket-pending-date-time-selector.tsx`
          (`src/features/workspace/components/ticket-pending-date-time-selector.tsx`): ticket
          pending date time selector workspace UI component.
        - `ticket-pending-date-presets.ts` and `ticket-pending-date-preset-row.tsx`:
          local-calendar preset arithmetic and the compact pending-date quick-select row.
        - `ticket-pending-date-time.ts`
          (`src/features/workspace/components/ticket-pending-date-time.ts`): pending date/time
          parsing, formatting, default, and future-date helpers.
        - `ticket-pending-state-form.tsx`
          (`src/features/workspace/components/ticket-pending-state-form.tsx`): compact pending
          date/time input used by staged pending state transitions.
        - `ticket-pending-time-column.tsx`
          (`src/features/workspace/components/ticket-pending-time-column.tsx`): ticket pending time
          column workspace UI component.
        - `ticket-primary-metadata-fields.tsx`
          (`src/features/workspace/components/ticket-primary-metadata-fields.tsx`): state, priority,
          and pending date/time sidebar controls that render editable inputs only when the provider
          advertises matching write capabilities.
        - `ticket-reply-recipient-editor.tsx`
          (`src/features/workspace/components/ticket-reply-recipient-editor.tsx`): editable To/Cc
          chip rows with normalization, cross-field deduplication, validation, and managed-address
          warning.
        - `ticket-priority-mutation-options.tsx`
          (`src/features/workspace/components/ticket-priority-mutation-options.tsx`): priority
          dropdown options for staged priority updates.
        - `ticket-rich-text-editor-dom.ts`
          (`src/features/workspace/components/ticket-rich-text-editor-dom.ts`): ticket rich text
          editor dom workspace helper module.
        - `ticket-rich-text-editor-selection.ts`
          (`src/features/workspace/components/ticket-rich-text-editor-selection.ts`): captures,
          serializes, revalidates, and applies fail-closed selected-text rewrite ranges.
        - `ticket-rich-text-editor-range.ts`
          (`src/features/workspace/components/ticket-rich-text-editor-range.ts`): normalizes hidden
          browser block-boundary endpoints so selection replacement preserves adjacent paragraphs.
        - `use-ticket-rich-text-editor-rewrite.ts`
          (`src/features/workspace/components/use-ticket-rich-text-editor-rewrite.ts`): preserves
          selection context across toolbar focus and exposes the editor rewrite controller.
        - `ticket-rich-text-editor-toolbar-row.tsx`
          (`src/features/workspace/components/ticket-rich-text-editor-toolbar-row.tsx`): ticket rich
          text editor toolbar row workspace UI component.
        - `ticket-rich-text-editor-toolbar.tsx`
          (`src/features/workspace/components/ticket-rich-text-editor-toolbar.tsx`): ticket rich
          text editor toolbar workspace UI component.
        - `ticket-rich-text-editor.tsx`
          (`src/features/workspace/components/ticket-rich-text-editor.tsx`): ticket rich text editor
          workspace UI component with scroll-safe autofocus.
        - `ticket-secondary-links-field.tsx`
          (`src/features/workspace/components/ticket-secondary-links-field.tsx`): linked ticket
          sidebar rows, staged pending-link display, and Add link modal trigger when related-link
          writes are supported.
        - `ticket-secondary-metadata-fields.tsx`
          (`src/features/workspace/components/ticket-secondary-metadata-fields.tsx`): thin
          composition wrapper for selected-ticket subscription, tags, and related links sidebar
          sections.
        - `ticket-secondary-subscription-field.tsx`
          (`src/features/workspace/components/ticket-secondary-subscription-field.tsx`): compact
          subscription toggle sidebar section that renders editable state only when the provider
          advertises subscription writes.
        - `ticket-secondary-tags-field.tsx`
          (`src/features/workspace/components/ticket-secondary-tags-field.tsx`): tag chip combobox
          sidebar section with provider-neutral suggestions, inline add-tag entry, and removable
          chips when tag writes are supported.
        - `ticket-sidebar-field.tsx` (`src/features/workspace/components/ticket-sidebar-field.tsx`):
          shared sidebar read-only and editable field wrappers.
        - `ticket-state-mutation-options.tsx`
          (`src/features/workspace/components/ticket-state-mutation-options.tsx`): state dropdown
          option helpers for provider-supplied hidden states and selected-value display.
        - `ticket-tab-metadata.ts` (`src/features/workspace/components/ticket-tab-metadata.ts`):
          small helper for patching open ticket tab display metadata after successful staged
          updates.
        - `ticket-table-cells.tsx` (`src/features/workspace/components/ticket-table-cells.tsx`):
          production state and priority display cells driven by canonical ticket labels and keys.
        - `ticket-table-grid.tsx` (`src/features/workspace/components/ticket-table-grid.tsx`):
          production ticket grid layout, header, and cell helpers driven by workspace column
          definitions.
        - `ticket-table-group-header.tsx`
          (`src/features/workspace/components/ticket-table-group-header.tsx`): grouped ticket table
          bucket header rendering and grouped-load-more controls.
        - `ticket-table-grouping.ts` (`src/features/workspace/components/ticket-table-grouping.ts`):
          provider-neutral local presentation grouping and sorting helpers for loaded workspace
          rows.
        - `ticket-table-load-more.tsx`
          (`src/features/workspace/components/ticket-table-load-more.tsx`): ticket table load-more
          tongue control and count-label helpers for grouped and ungrouped list pagination.
        - `ticket-table-row.tsx` (`src/features/workspace/components/ticket-table-row.tsx`):
          production ticket table row rendering and row cell value mapping.
        - `ticket-table-types.ts` (`src/features/workspace/components/ticket-table-types.ts`):
          ticket table group shape shared by grouped table modules.
        - `ticket-table.tsx` (`src/features/workspace/components/ticket-table.tsx`): production
          ticket list table shell, select-all header control, and row/header presentation for
          workspace ticket rows.
        - `ticket-tabs-merge.ts` (`src/features/workspace/components/ticket-tabs-merge.ts`): helper
          for merging initial selected-ticket tabs with row-derived tabs.
        - `ticket-tabs-panel.tsx` (`src/features/workspace/components/ticket-tabs-panel.tsx`):
          production list/open-ticket tab panel composition.
        - `ticket-thread-article-styles.ts`
          (`src/features/workspace/components/ticket-thread-article-styles.ts`): narrow class-map
          companion for thread article variants, thin direction-rail colors, and action selected
          states.
        - `ticket-thread-article-parts.tsx`
          (`src/features/workspace/components/ticket-thread-article-parts.tsx`): thread article
          avatar, recipient detail, contextual Reply/Reply all action, and replyability components.
        - `ticket-thread-article.tsx`
          (`src/features/workspace/components/ticket-thread-article.tsx`): production article
          presentation with explicit item boundaries, thin direction rails, sanitized rich-text
          rendering, display-name-first From/To/Cc/Bcc metadata, attachment metadata display, and
          provider-neutral contextual reply actions.
        - `ticket-thread.tsx` (`src/features/workspace/components/ticket-thread.tsx`): production
          ticket article thread and top-composer owner. It restores one local contextual draft,
          renders recipients and AI suggestions, and delegates article source selection upward.
        - `use-ticket-communication-selection.ts`
          (`src/features/workspace/components/use-ticket-communication-selection.ts`): ticket-level
          communication source/mode selection, dirty-replacement confirmation, conversation-local
          scroll, and focus hook shared by footer and article actions.
        - `ticket-workspace-chrome.tsx`
          (`src/features/workspace/components/ticket-workspace-chrome.tsx`): ticket workspace chrome
          workspace UI component.
        - `ticket-workspace-content.tsx`
          (`src/features/workspace/components/ticket-workspace-content.tsx`): orientation-aware
          workspace content shell that places the tabs panel and active work area.
        - `ticket-workspace-display-derived.ts`
          (`src/features/workspace/components/ticket-workspace-display-derived.ts`): derived
          provider-grouping and active-ticket summary helpers for workspace display composition.
        - `ticket-workspace-display-types.ts`
          (`src/features/workspace/components/ticket-workspace-display-types.ts`): type contracts
          for ticket workspace display.
        - `ticket-workspace-display-work-area.tsx`
          (`src/features/workspace/components/ticket-workspace-display-work-area.tsx`):
          list/detail work-area switch for the workspace display coordinator.
        - `ticket-workspace-display.tsx`
          (`src/features/workspace/components/ticket-workspace-display.tsx`): client-side production
          workspace display composition for controls, tabs, table, and selected-ticket detail
          surfaces.
        - `ticket-workspace-search-area.tsx`
          (`src/features/workspace/components/ticket-workspace-search-area.tsx`): flat detailed
          provider search results using the production ticket table without saved-view grouping,
          including orientation-aware subsection insets.
        - `ticket-workspace-search-props.ts`
          (`src/features/workspace/components/ticket-workspace-search-props.ts`): focused global
          search action and scope prop contracts shared by workspace composition modules.
        - `ticket-workspace-scope.ts`
          (`src/features/workspace/components/ticket-workspace-scope.ts`): derives the active
          personal-connection search scope without exposing provider credentials.
        - `ticket-workspace-fallbacks.ts`
          (`src/features/workspace/components/ticket-workspace-fallbacks.ts`): ticket workspace
          fallbacks workspace helper module.
        - `ticket-workspace-link-targets.ts`
          (`src/features/workspace/components/ticket-workspace-link-targets.ts`): ticket workspace
          link targets workspace helper module.
        - `ticket-workspace-persisted-tabs.ts`
          (`src/features/workspace/components/ticket-workspace-persisted-tabs.ts`): focused helper
          for deriving initial open, recent, and active workspace tabs from saved server UI state
          and direct selected-ticket detail.
        - `ticket-workspace-saved-view-options.ts`
          (`src/features/workspace/components/ticket-workspace-saved-view-options.ts`): saved-view
          dropdown option and active saved-view label helpers for the workspace display.
        - `ticket-workspace-state-types.ts`
          (`src/features/workspace/components/ticket-workspace-state-types.ts`): shared workspace
          display state prop and active-pane types.
        - `ticket-workspace-state.ts`
          (`src/features/workspace/components/ticket-workspace-state.ts`): client-side
          workspace-only state for active pane, open ticket tabs, recently viewed tabs, tab metadata
          patches after successful staged updates, tab orientation, visible columns, row selection,
          grouping, sorting, merged-ticket replacement/notice coordination, and route navigation.
        - `ticket-tab-collection.ts`
          (`src/features/workspace/components/ticket-tab-collection.ts`): pure local tab equality,
          open-with-capacity, and reorder helpers.
        - `ticket-merge-notice.tsx`
          (`src/features/workspace/components/ticket-merge-notice.tsx`): non-modal merged-source to
          survivor workspace notice.
        - `ticket-workspace-types.ts`
          (`src/features/workspace/components/ticket-workspace-types.ts`): type contracts for ticket
          workspace.
        - `ticket-workspace-work-area.tsx`
          (`src/features/workspace/components/ticket-workspace-work-area.tsx`): selected-ticket
          detail work-area states and rendering.
        - `ticket-workspace-list-area.tsx`
          (`src/features/workspace/components/ticket-workspace-list-area.tsx`): list toolbar,
          status, and results subsections with orientation-aware insets.
        - `ticket-workspace.tsx` (`src/features/workspace/components/ticket-workspace.tsx`):
          provider-backed workspace composition for the real `/workspace` route. It wires
          provider-neutral read models, metadata mutation capabilities, and communication
          capabilities into approved production workspace components.
        - `use-ticket-detail-loader.ts`
          (`src/features/workspace/components/use-ticket-detail-loader.ts`): in-memory
          per-workspace-session selected-ticket detail and AI-summary cache plus client detail
          loader for post-hydration row opens.
        - `use-ticket-list-group-loader.ts`
          (`src/features/workspace/components/use-ticket-list-group-loader.ts`): use ticket list
          group loader workspace helper module.
        - `use-complete-ticket-list-sort.ts`
          (`src/features/workspace/components/use-complete-ticket-list-sort.ts`): loads every
          matching provider page for relationship display-name sorts, orders the complete result,
          and exposes it through the existing incremental list window.
        - `use-ticket-list-pager.ts` (`src/features/workspace/components/use-ticket-list-pager.ts`):
          in-memory active-workspace list pager for appending provider-backed ungrouped list pages
          and reloading page 1 for provider-backed sort changes or state/priority grouped buckets
          after the provider reload succeeds, while preserving provider-backed total count metadata
          and independent grouped-bucket cursors without touching selected-ticket detail reads.
        - `use-ticket-search-controller.ts`
          (`src/features/workspace/components/use-ticket-search-controller.ts`): session-scoped,
          debounced quick search and independent detailed result paging, sorting, refresh, and
          stale-response suppression.
        - `use-ticket-list-silent-refresh.ts`
          (`src/features/workspace/components/use-ticket-list-silent-refresh.ts`): use ticket list
          silent refresh workspace helper module.
        - `use-ticket-list-server-sync.ts`
          (`src/features/workspace/components/use-ticket-list-server-sync.ts`): reconciles incoming
          server list snapshots while preserving active provider sort and requesting an
          authoritative sorted refresh.
        - `use-ticket-workspace-auto-refresh.ts`
          (`src/features/workspace/components/use-ticket-workspace-auto-refresh.ts`): use ticket
          workspace auto refresh workspace helper module.
        - `use-ticket-workspace-saved-view-selection.ts`
          (`src/features/workspace/components/use-ticket-workspace-saved-view-selection.ts`):
          saved-view change and fallback-selection hook for workspace display state.
        - `use-ticket-workspace-table-state.ts`
          (`src/features/workspace/components/use-ticket-workspace-table-state.ts`): use ticket
          workspace table state workspace helper module.
        - `use-ticket-workspace-tabs-state.ts`
          (`src/features/workspace/components/use-ticket-workspace-tabs-state.ts`): use ticket
          workspace tabs state workspace helper module.
        - `use-ticket-tab-import.ts`
          (`src/features/workspace/components/use-ticket-tab-import.ts`): explicit import control,
          single-flight/cancellation guards, exact free-capacity handling, committed-result
          feedback, and local append orchestration.
        - `ticket-tab-import-hydration.ts`
          (`src/features/workspace/components/ticket-tab-import-hydration.ts`): identity-scoped,
          bounded-concurrency detail hydration, import-wide failure short-circuiting,
          merged-source resolution, deduplication, cancellation checks, and explicit scan-limit
          accounting.
        - `ticket-tab-import-notice.tsx`
          (`src/features/workspace/components/ticket-tab-import-notice.tsx`): accessible import
          success, partial-result, and failure feedback.
        - `ticket-communication-draft-runtime.ts`
          (`src/features/workspace/components/ticket-communication-draft-runtime.ts`): complete
          personal draft scope keys and ordered IndexedDB work used to close the
          component-unmount and tab-switch persistence race.
        - `use-saved-view-settings-data.ts`
          (`src/features/workspace/components/use-saved-view-settings-data.ts`): one-time Views
          provider lookup enrichment over immediately available saved-view definitions.
        - `use-saved-view-owner-compatibility.ts`
          (`src/features/workspace/components/use-saved-view-owner-compatibility.ts`): positive
          group-dependent owner option loading and incompatible View-condition feedback.
        - `use-ticket-owner-lookup.ts`
          (`src/features/workspace/components/use-ticket-owner-lookup.ts`): race-safe owner lookup
          state for staged ticket Group changes.
        - `workspace-connection-form.tsx`
          (`src/features/workspace/components/workspace-connection-form.tsx`): workspace connection
          form workspace UI component.
        - `workspace-controls.tsx` (`src/features/workspace/components/workspace-controls.tsx`):
          read-safe workspace presentation for the always-available tab layout segmented control.
        - `workspace-header.tsx` (`src/features/workspace/components/workspace-header.tsx`):
          production workspace header presentation with brand, global search, tab layout controls,
          and an avatar/profile menu fed by real connection/action props.
        - `workspace-ticket-search.tsx`
          (`src/features/workspace/components/workspace-ticket-search.tsx`): keyboard-accessible
          header search input and anchored ten-result quick picker.
        - `workspace-ai-settings-admin-form.tsx`
          (`src/features/workspace/components/workspace-ai-settings-admin-form.tsx`): admin-only
          active-workspace AI policy, workspace-default provider settings, and non-admin AI user
          permission form.
        - `workspace-ai-settings-fields.tsx`
          (`src/features/workspace/components/workspace-ai-settings-fields.tsx`): shared
          provider-neutral AI protocol, HTTPS base URL, model, and API key input fields.
        - `workspace-ai-settings-section.tsx`
          (`src/features/workspace/components/workspace-ai-settings-section.tsx`): Settings dialog
          AI Settings section that routes admin controls, user status, and user-provided key forms.
        - `workspace-ai-settings-user-form.tsx`
          (`src/features/workspace/components/workspace-ai-settings-user-form.tsx`): user
          per-workspace AI provider settings form for user-provided-key workspaces.
        - `workspace-ai-prompt-forms.tsx`
          (`src/features/workspace/components/workspace-ai-prompt-forms.tsx`): Prompt Center
          workspace prompt/guidance forms, immutable contract explanation, and action messages.
        - `workspace-ai-prompt-center-sidebar.tsx`
          (`src/features/workspace/components/workspace-ai-prompt-center-sidebar.tsx`):
          grouped Prompt Center sidebar for AI operations, ordered rephrase styles, and
          personal overrides.
        - `workspace-ai-rephrase-style-forms.tsx`
          (`src/features/workspace/components/workspace-ai-rephrase-style-forms.tsx`): Prompt
          Center forms for workspace rephrase style CRUD and personal style overrides.
        - `workspace-ai-prompts-section.tsx`
          (`src/features/workspace/components/workspace-ai-prompts-section.tsx`): Settings dialog
          Prompt Center sidebar/detail section for admin-managed workspace prompts or guidance,
          workspace rephrase styles, and membership-gated personal style overrides.
        - `workspace-notifications-panel.tsx`
          (`src/features/workspace/components/workspace-notifications-panel.tsx`): workspace
          notifications panel workspace UI component.
        - `workspace-notifications-utils.ts`
          (`src/features/workspace/components/workspace-notifications-utils.ts`): workspace
          notifications utils workspace helper module.
        - `workspace-notifications.tsx`
          (`src/features/workspace/components/workspace-notifications.tsx`): workspace notifications
          workspace UI component.
        - `workspace-saved-view-options.ts`
          (`src/features/workspace/components/workspace-saved-view-options.ts`): workspace saved
          view options workspace helper module.
        - `workspace-settings-connections.ts`
          (`src/features/workspace/components/workspace-settings-connections.ts`): workspace
          settings connections workspace helper module.
        - `workspace-settings-dialog.tsx`
          (`src/features/workspace/components/workspace-settings-dialog.tsx`): 90vw/90vh Settings
          shell with Profile, Workspaces, Views, AI Settings, My Style, and Prompt Center sections.
        - `workspace-settings-dialog-types.ts`
          (`src/features/workspace/components/workspace-settings-dialog-types.ts`): Settings
          dialog prop contract kept separate from the shell component.
        - `workspace-settings-nav.tsx`
          (`src/features/workspace/components/workspace-settings-nav.tsx`): Settings dialog sidebar
          navigation and section button presentation.
        - `workspace-settings-profile-section.tsx`
          (`src/features/workspace/components/workspace-settings-profile-section.tsx`): in-modal
          My Profile account/password form composition.
        - `workspace-settings-profile-account-card.tsx`
          (`src/features/workspace/components/workspace-settings-profile-account-card.tsx`): My
          Profile account summary, first/last name form, and avatar upload control.
        - `workspace-settings-my-style-form.tsx`
          (`src/features/workspace/components/workspace-settings-my-style-form.tsx`): My Style
          form fields for private active-workspace role, audience, tone, preference, and constraint
          guidance.
        - `workspace-settings-my-style-section.tsx`
          (`src/features/workspace/components/workspace-settings-my-style-section.tsx`): Workspace
          Settings My Style section wrapper and header.
        - `workspace-settings-profile-name-field.tsx`
          (`src/features/workspace/components/workspace-settings-profile-name-field.tsx`): reusable
          first/last name input row with international-name tooltip.
        - `workspace-settings-profile-password-form.tsx`
          (`src/features/workspace/components/workspace-settings-profile-password-form.tsx`):
          in-modal My Profile password-change form.
        - `workspace-settings-user-form.tsx`
          (`src/features/workspace/components/workspace-settings-user-form.tsx`): admin user
          create/edit side-panel form with workspace membership and AI permission controls.
        - `workspace-settings-users-section.tsx`
          (`src/features/workspace/components/workspace-settings-users-section.tsx`): admin-only
          Settings Users section with user table, create/edit, reset-password, and delete flows.
        - `workspace-settings-users-table.tsx`
          (`src/features/workspace/components/workspace-settings-users-table.tsx`): shared table
          presentation for Settings user rows and row actions.
        - `workspace-settings-types.ts`
          (`src/features/workspace/components/workspace-settings-types.ts`): shared Settings section
          identifier type.
        - `workspace-settings-view-conditions.tsx`
          (`src/features/workspace/components/workspace-settings-view-conditions.tsx`):
          provider-neutral condition builder used by the Views settings section.
        - `workspace-settings-view-details-form.tsx`
          (`src/features/workspace/components/workspace-settings-view-details-form.tsx`): workspace
          settings view details form workspace UI component.
        - `workspace-settings-views-list.tsx`
          (`src/features/workspace/components/workspace-settings-views-list.tsx`): left-pane
          saved-view list with default markers and reorder controls.
        - `workspace-settings-views-section.tsx`
          (`src/features/workspace/components/workspace-settings-views-section.tsx`): in-modal
          saved-view list and edit/create surface.
        - `workspace-settings-views-utils.tsx`
          (`src/features/workspace/components/workspace-settings-views-utils.tsx`): local saved-view
          draft, icon, color, and condition-value helpers for Settings Views.
        - `workspace-settings-workspaces-section.tsx`
          (`src/features/workspace/components/workspace-settings-workspaces-section.tsx`): in-modal
          helpdesk connection management surface.
        - `workspace-states.tsx` (`src/features/workspace/components/workspace-states.tsx`):
          provider-neutral unavailable, retired merged-ticket tombstone, detail-unavailable, and
          empty-detail states.
        - `workspace-url.ts` (`src/features/workspace/components/workspace-url.ts`): workspace
          ticket/List URL path helper used by local tab navigation and explicit ticket link sharing,
          plus history replacement helpers for local tab navigation.
      - `actions.ts` (`src/features/workspace/actions.ts`): server actions for workspace-owned UI
        state, including active-workspace scoped persisted open tabs.
      - `ticket-detail-hydration-action.ts`
        (`src/features/workspace/ticket-detail-hydration-action.ts`): authenticated coordinated
        detail and cache-only AI summary hydration for tickets opened after the initial route.
      - `ticket-detail-hydration.ts` (`src/features/workspace/ticket-detail-hydration.ts`):
        client-safe coordinated detail hydration result and action contracts.
      - `index.ts` (`src/features/workspace/index.ts`): workspace feature boundary. UI copy may say
        workspace because shared Workspace and personal HelpdeskConnection are distinct persisted
        concepts. This barrel exports production workspace UI only.
      - `workspace-tab-state.ts` (`src/features/workspace/workspace-tab-state.ts`): provider-neutral
        persisted workspace tab state parser, serializer, cap, and ticket-detail tab adapter
        helpers.
  - `src/providers`: provider registry and provider plugin entrypoints.
    - `src/providers/zammad`: Zammad provider plugin, API client, mapping, schemas, and capability
      implementations.
      - `client.ts` (`src/providers/zammad/client.ts`): Zammad read/write client wrapper around the
        provider-safe JSON request helper.
      - `credentials.ts` (`src/providers/zammad/credentials.ts`): provider-specific Basic Auth
        credential parsing and header construction.
      - `connection-identity.ts` (`src/providers/zammad/connection-identity.ts`): Zammad
        `/users/me` response validation and provider-neutral external identity mapping.
      - `errors.ts` (`src/providers/zammad/errors.ts`): provider HTTP status classification.
      - `index.ts` (`src/providers/zammad/index.ts`): provider plugin export.
      - `mapping.ts` (`src/providers/zammad/mapping.ts`): provider raw value to canonical ticket,
        article, attachment, state, and priority mapping.
      - `article-attachments.ts` (`src/providers/zammad/article-attachments.ts`): pure Zammad
        message-alternative, referenced-inline-resource, and user-visible attachment
        classification for raw CID and transformed inline-URL article bodies.
      - `article-body.ts` (`src/providers/zammad/article-body.ts`): sanitized Zammad article-body
        mapping that parses explicit markers and containers, strictly validates learned signature
        positions, emits typed provider-neutral advisory hints with final-HTML offsets, removes
        raw provider markers, and accepts provider-owned inline-image source rewriting.
      - `article-signature-hints.ts` (`src/providers/zammad/article-signature-hints.ts`):
        per-operation unguessable hint transport, raw marker/container parsing, exact normalized
        offset derivation, and reserved-class cleanup shared by sanitized display and raw
        conversation-history preparation.
      - `mutation-policy.ts` (`src/providers/zammad/mutation-policy.ts`): Zammad-only state mutation
        availability rules, exposed to core/UI as canonical hidden state keys and pending-date
        requirements.
      - `mutations.ts` (`src/providers/zammad/mutations.ts`): Zammad-only state, priority, owner,
        group, tag, link, and subscription metadata write orchestration, pending-time payload
        construction, state-transition guard, and endpoint call implementation.
      - `notifications.ts` (`src/providers/zammad/notifications.ts`): Zammad provider notifications
        module, including validated expanded/direct ticket enrichment and isolation of stale
        inaccessible ticket references.
      - `participant-values.ts` (`src/providers/zammad/participant-values.ts`): Zammad relation-id,
        named-reference, user display-name, email, and organization normalization helpers.
      - `participants.ts` (`src/providers/zammad/participants.ts`): Zammad user/participant
        display-name, email fallback, recipient, and expanded asset mapping helpers.
      - `plugin.ts` (`src/providers/zammad/plugin.ts`): provider plugin object, capabilities, and
        connection validation boundary.
      - `taskbar-schema.ts` (`src/providers/zammad/taskbar-schema.ts`): pinned Zammad taskbar DTO
        validation and strict ticket-task recognition.
      - `taskbar-import.ts` (`src/providers/zammad/taskbar-import.ts`): provider-local, read-only
        desktop ticket-task import with ordering and deduplication.
      - `reply-addresses.ts` (`src/providers/zammad/reply-addresses.ts`): server-only RFC address
        list parsing, normalization, managed-address cleanup, and To/Cc deduplication.
      - `reply-context.ts` (`src/providers/zammad/reply-context.ts`): pure Zammad-native Reply and
        Reply all eligibility/default derivation plus opaque context versioning.
      - `reply-conversation-history.ts` and `reply-conversation-history-images.ts`: public
        ticket-wide history eligibility, `through-source`/`current` scoping and versioning,
        deduplicated newest-first transcript assembly, attachment-name projection, and bounded
        provider-private inline-image reads.
      - `forward-context.ts` (`src/providers/zammad/forward-context.ts`): pure public-email forward
        eligibility, exact-subject default, and opaque context version derivation.
      - `forward-attachments.ts` (`src/providers/zammad/forward-attachments.ts`): visible
        source-attachment selection revalidation plus bounded provider-private file reads.
      - `ticket-inline-images.ts` (`src/providers/zammad/ticket-inline-images.ts`): fresh
        ticket/article ownership and inline-resource revalidation plus bounded raster-byte reads.
      - `ticket-attachments.ts` (`src/providers/zammad/ticket-attachments.ts`): fresh
        ticket/article ownership and visible-file classification revalidation plus bounded
        attachment-byte reads.
      - `reply-policy.ts` (`src/providers/zammad/reply-policy.ts`): active Zammad system email
        address lookup with fail-closed optional context behavior.
      - `schemas.ts` (`src/providers/zammad/schemas.ts`): Zammad raw ticket, article, expanded
        asset, and user DTO schemas.
      - `ticket-article-mutations.ts` (`src/providers/zammad/ticket-article-mutations.ts`):
        narrow exports for split Zammad article mutation modules.
      - `ticket-customer-reply-mutation.ts`
        (`src/providers/zammad/ticket-customer-reply-mutation.ts`): contextual customer reply
        recipient normalization, reviewed transcript assembly, subject/thread headers, provider
        POST, and uncertain delivery mapping.
      - `ticket-customer-reply-context.ts`
        (`src/providers/zammad/ticket-customer-reply-context.ts`): fresh ticket/source/address
        revalidation plus optional full public-history read and opaque-version comparison input.
      - `ticket-forward-mutation.ts` (`src/providers/zammad/ticket-forward-mutation.ts`): fresh
        forward source/attachment revalidation, bounded provider attachment reads, Zammad article
        creation without reply-threading headers, and uncertain-delivery mapping.
      - `ticket-signature.ts` and `outbound-signature.ts`: version-compatible Zammad
        form-updater/dedicated-query signature rendering, bounded attachment inlining, and
        reviewed signature insertion into Zammad article payloads.
      - `ticket-detail-payload.ts` (`src/providers/zammad/ticket-detail-payload.ts`): focused
        expanded/full detail payload, user lookup, and asset merge helpers.
      - `ticket-groups.ts` (`src/providers/zammad/ticket-groups.ts`): Zammad provider-owned
        state/priority bucket discovery and grouped list page orchestration.
      - `ticket-id.ts` (`src/providers/zammad/ticket-id.ts`): strict provider-local numeric ticket
        and article reference parser for Zammad writes.
      - `ticket-internal-note-mutation.ts`
        (`src/providers/zammad/ticket-internal-note-mutation.ts`): focused Zammad internal-note
        article write and response validation.
      - `ticket-link-targets.ts` (`src/providers/zammad/ticket-link-targets.ts`): Zammad
        provider-local ticket search for Add link targets, including provider-local same-customer
        query mapping, mapped to provider-neutral link target summaries.
      - `ticket-merge-resolution.ts` (`src/providers/zammad/ticket-merge-resolution.ts`):
        provider-owned ticket history parsing and authoritative merged destination mapping.
      - `ticket-mutation-preflight.ts` (`src/providers/zammad/ticket-mutation-preflight.ts`):
        shared fresh-ticket merged-state rejection before ticket or article writes.
      - `owner-assignment.ts` (`src/providers/zammad/owner-assignment.ts`): fresh final owner/group
        compatibility revalidation before Zammad ticket writes.
      - `ticket-list.ts` (`src/providers/zammad/ticket-list.ts`): Zammad ticket list endpoint reads,
        pagination up to 100 rows, grouped-list dispatch, and read-phase timing.
      - `ticket-list-assets.ts` (`src/providers/zammad/ticket-list-assets.ts`): provider-owned
        user, group, state, priority, and organization fallback lookups for full list payloads.
      - `ticket-full-text-search.ts` (`src/providers/zammad/ticket-full-text-search.ts`):
        provider-owned full-text validation bridge and invalid Zammad search-response mapping.
      - `ticket-list-payload.ts` (`src/providers/zammad/ticket-list-payload.ts`): Zammad ticket list
        payload parsing, merged-source filtering, pagination metadata, and canonical row mapping.
      - `ticket-lookups.ts` (`src/providers/zammad/ticket-lookups.ts`): paginated Zammad group and
        agent lookup reads, including full-access group scoping, mapped to provider-neutral options.
      - `ticket-mentions.ts` (`src/providers/zammad/ticket-mentions.ts`): Zammad group-scoped
        mention suggestions plus final neutral-token conversion and write-error mapping.
      - `ticket-search-query.ts` (`src/providers/zammad/ticket-search-query.ts`): Zammad ticket
        search path using full list assets, sort, state/priority filter,
        merged-source exclusion, and state/priority bucket query construction.
      - `ticket-state.ts` (`src/providers/zammad/ticket-state.ts`): protected merged-state
        recognition from raw ticket fields and expanded assets.
      - `ticket-secondary-mutations.ts` (`src/providers/zammad/ticket-secondary-mutations.ts`):
        Zammad selected-ticket secondary metadata writes for tags, related links, relation-kind link
        adds, and subscription state.
      - `ticket-secondary.ts` (`src/providers/zammad/ticket-secondary.ts`): optional Zammad
        selected-ticket secondary reads for tags, related ticket links, subscription state, and
        missing group-name lookup.
      - `ticket-subscription.ts` (`src/providers/zammad/ticket-subscription.ts`): Zammad
        subscription/following reads through `/users/me` and `/mentions`, with provider-safe
        unavailable diagnostics for optional detail fallback behavior.
      - `tickets.ts` (`src/providers/zammad/tickets.ts`): Zammad ticket detail/thread endpoint reads
        and canonical detail response assembly with provider-neutral secondary data; list reads are
        re-exported from the provider-local list module.
    - `available-providers.ts` (`src/providers/available-providers.ts`): single documented provider
      assembly file allowed to import installed provider plugins directly before exporting the
      provider-neutral registry.
    - `index.ts` (`src/providers/index.ts`): registry exports.
    - `registry.ts` (`src/providers/registry.ts`): provider-neutral registry factory.
  - `src/security`: security-sensitive helpers for encryption, URL validation, provider HTTP,
    logging, and sanitization.
    - `base-url-validation.ts` (`src/security/base-url-validation.ts`): provider-neutral HTTPS and
      SSRF validation for user-provided helpdesk base URLs.
    - `encryption.ts` (`src/security/encryption.ts`): AES-256-GCM secret envelope encryption.
    - `provider-http-request.ts` (`src/security/provider-http-request.ts`): provider HTTP request
      internals for revalidated address binding, redirects-disabled fetches, bounded reads/writes,
      and safe JSON body errors.
    - `provider-http-binary-request.ts` (`src/security/provider-http-binary-request.ts`):
      redirects-disabled, pinned-address, content-length and streaming bounded binary reads.
    - `provider-http.ts` (`src/security/provider-http.ts`): public SSRF-safe provider HTTPS/JSON
      helper boundary and exports.
    - `safe-log.ts` (`src/security/safe-log.ts`): helper for safe metadata-only logs.
    - `sanitize-html.ts` (`src/security/sanitize-html.ts`): provider HTML sanitization that
      preserves safe rich-text and conservative email presentation, accepts only caller-verified
      rewritten images, and drops scripts, remote images, active layout, and unsafe attributes.
  - `src/telemetry`: metadata-only provider operation audit and timing helpers.
    - `ai-generation-timing.ts` (`src/telemetry/ai-generation-timing.ts`): sanitized AI timing
      logger that records only operation phase, protocol family, duration, and outcome metadata.
    - `cache-age-bucket.ts` (`src/telemetry/cache-age-bucket.ts`): metadata-only cache freshness
      age bucket helper used by provider detail and AI summary cache observability.
    - `ticket-communication-audit.ts` (`src/telemetry/ticket-communication-audit.ts`): sanitized
      communication audit logger that records only communication kind and outcome metadata.
    - `ticket-mutation-audit.ts` (`src/telemetry/ticket-mutation-audit.ts`): sanitized metadata
      mutation audit logger that records only mutation field names/counts and outcome metadata.
    - `ticket-read-timing.ts` (`src/telemetry/ticket-read-timing.ts`): sanitized ticket timing
      logger used by provider-backed list/detail orchestration, controlled metadata mutations, and
      provider request/mapping phases.

## Data, Scripts, Tests, And Docs

- `docs`: public project documentation.
  - `docs/architecture`: architecture maps, provider boundaries, and ticket read contracts.
    - `ai-prompt-registry-contract.md`
      (`docs/architecture/ai-prompt-registry-contract.md`): AI prompt registry, Prompt Center,
      prompt versioning, workspace rephrase style, privacy, and cache invalidation contract.
    - `ai-source-review-contract.md` (`docs/architecture/ai-source-review-contract.md`): AI source
      freshness, review/approval, failure-state, and logging contract for future drafting, reply,
      and reviewed-action operations.
    - `ai-v1-product-surface.md` (`docs/architecture/ai-v1-product-surface.md`): AI Assistant v1
      product surface, terminology, selected-ticket context boundary, review requirements, and
      automation exclusions.
    - `cache-and-privacy-contract.md` (`docs/architecture/cache-and-privacy-contract.md`):
      provider-data cache, refresh/staleness, privacy, and AI prompt-readiness contract.
    - `codebase-map.md` (`docs/architecture/codebase-map.md`): this file-role map.
    - `overview.md` (`docs/architecture/overview.md`): core product and architecture boundaries.
    - `provider-plugins.md` (`docs/architecture/provider-plugins.md`): provider plugin ownership and
      registration rules.
    - `zammad-personal-draft-sync-deferred.md`
      (`docs/architecture/zammad-personal-draft-sync-deferred.md`): live contract invalidation,
      contained local-only behavior, future characterization procedure, and decision gate for
      personal cross-application draft synchronization.
    - `read-only-ai-contract.md` (`docs/architecture/read-only-ai-contract.md`): implemented
      selected-ticket AI Assistant summary boundary, prompt data, runtime configuration, failure,
      and cache rules.
    - `my-style-contract.md` (`docs/architecture/my-style-contract.md`): user-owned My Style data,
      privacy, prompt composition, reset, and drafting-scope contract.
    - `ticket-read-contract.md` (`docs/architecture/ticket-read-contract.md`): canonical
      provider-neutral ticket read model, controlled metadata mutation contract, thread article
      shape, capabilities, and non-goals.
    - `ticket-search-contract.md` (`docs/architecture/ticket-search-contract.md`): provider-backed
      global ticket search behavior, privacy, paging, sorting, and workspace interaction contract.
  - `docs/deploy`: deployment configuration and environment documentation.
    - `docs/deploy/systemd`: systemd service examples for local development and deployment.
      - `resolvrr-dev.service.example` (`docs/deploy/systemd/resolvrr-dev.service.example`):
        user-level dev service template.
    - `.env.example` (`docs/deploy/.env.example`): committed environment template.
    - `environment.md` (`docs/deploy/environment.md`): environment variable purpose and handling.
  - `docs/development`: developer workflow documentation.
    - `dependency-updates.md` (`docs/development/dependency-updates.md`): Dependabot and
      human-authored dependency update handling rules.
    - `local-development.md` (`docs/development/local-development.md`): development commands,
      service names, and local boundaries.
  - `docs/features`: user-facing feature behavior documentation.
    - `ai-capabilities.md` (`docs/features/ai-capabilities.md`): current and planned AI Assistant
      capabilities, workspace AI settings, Prompt Center, My Style, review rules, and privacy.
    - `auth.md` (`docs/features/auth.md`): authentication behavior and security notes.
    - `foundation.md` (`docs/features/foundation.md`): first foundation feature set and exclusions.
  - `docs/operations`: operational runbooks and service maintenance notes.
    - `cache-clear.md` (`docs/operations/cache-clear.md`): cache-clear script usage.
    - `dev-service.md` (`docs/operations/dev-service.md`): user-level dev service operations.
  - `docs/security`: security and privacy documentation.
    - `privacy.md` (`docs/security/privacy.md`): credential, provider data, cache, and logging
      privacy rules.
  - `docs/ui`: workspace UI contract and primitive documentation.
    - `primitives.md` (`docs/ui/primitives.md`): reusable UI primitive expectations.
    - `workspace-ui-contract.md` (`docs/ui/workspace-ui-contract.md`): approved workspace layout and
      interaction contract.
- `prisma`: Prisma schema and migrations.
  - `ai-prompts.prisma` (`prisma/ai-prompts.prisma`): encrypted workspace AI prompt defaults and
    workspace rephrase style/personal style override schema.
  - `ai-settings.prisma` (`prisma/ai-settings.prisma`): workspace-default and per-user workspace AI
    settings schema, including workspace-level non-admin AI permission defaults.
  - `app-policy.prisma` (`prisma/app-policy.prisma`): app policy key/value schema.
  - `auth.prisma` (`prisma/auth.prisma`): user, password login, and session schema.
  - `caches.prisma` (`prisma/caches.prisma`): selected-ticket detail/thread cache and generated AI
    summary cache schema.
  - `helpdesk-connections.prisma` (`prisma/helpdesk-connections.prisma`): shared Workspace,
    per-user HelpdeskConnection, workspace membership, personal provider credential, and
    metadata-only mutation log schema with durable workspace and optional personal-connection
    identity.
  - `my-style.prisma` (`prisma/my-style.prisma`): encrypted per-user/per-workspace My Style schema.
  - `workspace-signatures.prisma` (`prisma/workspace-signatures.prisma`): encrypted workspace
    default/group signature templates and immutable revision snapshots.
  - `prisma/migrations`: database migration history.
    - `prisma/migrations/20260519062146_init`: contains related 20260519062146_init files.
      - `migration.sql` (`prisma/migrations/20260519062146_init/migration.sql`): initial SQL schema
        migration for users, sessions, helpdesk connections, credentials, saved views, provider
        cache, preferences, mutation logs, and app policy storage.
    - `prisma/migrations/20260604120000_add_saved_view_seed_key`: contains related
      20260604120000_add_saved_view_seed_key files.
      - `migration.sql` (`prisma/migrations/20260604120000_add_saved_view_seed_key/migration.sql`):
        migration adding saved-view seed-key support.
    - `prisma/migrations/20260605204000_add_ticket_detail_cache_payload`: contains related
      20260605204000_add_ticket_detail_cache_payload files.
      - `migration.sql`
        (`prisma/migrations/20260605204000_add_ticket_detail_cache_payload/migration.sql`):
        migration adding encrypted selected-ticket detail cache payload and source-version columns.
    - `prisma/migrations/20260605213000_add_ai_summary_cache`: contains related
      20260605213000_add_ai_summary_cache files.
      - `migration.sql` (`prisma/migrations/20260605213000_add_ai_summary_cache/migration.sql`):
        migration adding encrypted selected-ticket AI summary output cache storage.
    - `prisma/migrations/20260715142000_separate_workspace_connections`: contains the hand-authored
      migration that preserves shared workspace data, creates disconnected owner personal
      connections, retargets owner credentials, clears provider-derived caches and unsafe legacy
      tabs, preserves metadata-only audits, and renames the active workspace preference.
    - `prisma/migrations/20260715190000_add_ticket_taskbar_sync`: contains the hand-authored
      migration for personal taskbar compatibility state and retryable operation outbox.
    - `prisma/migrations/20260717090000_add_taskbar_deactivate`: extends the durable taskbar
      operation kind with explicit List/ticket-deactivation intent.
    - `prisma/migrations/20260722120000_remove_ticket_taskbar_sync`: removes the obsolete
      automatic synchronization compatibility state, operation outbox, and enums.
    - `prisma/migrations/20260718100000_make_ai_summaries_durable`: removes time-based expiry
      from fingerprinted encrypted selected-ticket AI summaries while preserving existing rows.
    - `prisma/migrations/20260606003000_add_workspace_ai_settings`: contains related
      20260606003000_add_workspace_ai_settings files.
      - `migration.sql`
        (`prisma/migrations/20260606003000_add_workspace_ai_settings/migration.sql`):
        migration adding workspace policy/default AI settings and per-user workspace AI settings.
    - `prisma/migrations/20260607120000_add_ai_prompt_center`: contains related
      20260607120000_add_ai_prompt_center files.
      - `migration.sql` (`prisma/migrations/20260607120000_add_ai_prompt_center/migration.sql`):
        historical migration adding encrypted workspace prompt defaults and legacy personal AI
        customization structures later replaced by the workspace AI style system migration.
    - `prisma/migrations/20260614100000_add_user_my_style`: contains related
      20260614100000_add_user_my_style files.
      - `migration.sql` (`prisma/migrations/20260614100000_add_user_my_style/migration.sql`):
        historical migration adding old encrypted user-only My Style storage.
    - `prisma/migrations/20260614170000_workspace_ai_style_system`: contains related
      20260614170000_workspace_ai_style_system files.
      - `migration.sql`
        (`prisma/migrations/20260614170000_workspace_ai_style_system/migration.sql`): migration
        replacing old My Style and legacy prompt customization structures with workspace memberships,
        workspace-scoped My Style, workspace rephrase styles, and personal rephrase style overrides.
    - `prisma/migrations/20260618070000_add_ai_user_permission_defaults`: contains related
      20260618070000_add_ai_user_permission_defaults files.
      - `migration.sql`
        (`prisma/migrations/20260618070000_add_ai_user_permission_defaults/migration.sql`):
        migration adding workspace-level defaults for non-admin My Style and personal rephrase
        prompt customization permissions.
    - `prisma/migrations/20260618053953_apply_user_management_deactivation`: contains related
      20260618053953_apply_user_management_deactivation files.
      - `migration.sql`
        (`prisma/migrations/20260618053953_apply_user_management_deactivation/migration.sql`):
        migration generated during local migration apply to align Prisma-managed index names.
    - `prisma/migrations/20260618103000_add_user_management_deactivation`: contains related
      20260618103000_add_user_management_deactivation files.
      - `migration.sql`
        (`prisma/migrations/20260618103000_add_user_management_deactivation/migration.sql`):
        migration adding user deactivation state and changing provider mutation logs to retain
        audit history instead of cascading on user delete.
    - `migration_lock.toml` (`prisma/migrations/migration_lock.toml`): Prisma migration provider
      lockfile.
  - `saved-views.prisma` (`prisma/saved-views.prisma`): saved view and user saved-view preference
    schema.
  - `schema.prisma` (`prisma/schema.prisma`): Prisma generator, datasource, and shared enum schema.
  - `ui-preferences.prisma` (`prisma/ui-preferences.prisma`): user/workspace UI preference schema.
- `scripts`: repository maintenance, docs, cache, generated-file, and boundary-audit scripts.
  - `cache-clear.mjs` (`scripts/cache-clear.mjs`): clears local Next, TypeScript, and test caches
    and can optionally stop/start a user service.
  - `check-docs.mjs` (`scripts/check-docs.mjs`): checks required public docs exist, allows the
    approved AI Assistant product term, and avoids disallowed process-origin wording.
  - `check-file-sizes.mjs` (`scripts/check-file-sizes.mjs`): enforces production source file size
    caps, flags handwritten 500-line smells, and reports 300-line test/doc split candidates.
  - `check-next-env.mjs` (`scripts/check-next-env.mjs`): verifies generated Next TypeScript
    references are restored to the committed stable form.
  - `restore-next-env.mjs` (`scripts/restore-next-env.mjs`): restores the committed stable
    `next-env.d.ts` content after Next build/dev generation.
  - `zammad-boundary-audit-config.mjs` (`scripts/zammad-boundary-audit-config.mjs`):
    provider-boundary audit allowlists, scan roots, patterns, path normalization, and text scanner.
  - `zammad-boundary-audit-current.mjs` (`scripts/zammad-boundary-audit-current.mjs`): current-tree
    provider-boundary audit file collection and scan orchestration.
  - `zammad-boundary-audit-history.mjs` (`scripts/zammad-boundary-audit-history.mjs`): PR-history
    provider-boundary audit helpers, Git/GitHub reads, and markdown report rendering.
  - `zammad-boundary-audit.mjs` (`scripts/zammad-boundary-audit.mjs`): scans current source/docs or
    PR history for direct Zammad imports and raw Zammad token leakage outside the provider boundary
    allowlist.
- `tests`: Vitest unit, component, provider, and feature tests plus explicitly invoked
  Playwright files under `tests/e2e/*.pw.ts`.
  - `tests/components`: shared UI primitive and component tests.
    - `dropdowns.test.tsx` (`tests/components/dropdowns.test.tsx`): verifies searchable and
      non-searchable dropdown keyboard and close behavior.
    - `menu-tooltip.test.tsx` (`tests/components/menu-tooltip.test.tsx`): verifies menu and profile
      menu behavior.
    - `primitives-state.test.tsx` (`tests/components/primitives-state.test.tsx`): verifies basic
      primitive states.
    - `table-ticket.test.tsx` (`tests/components/table-ticket.test.tsx`): verifies ticket tab and
      table header callbacks.
    - `table.test.tsx` (`tests/components/table.test.tsx`): verifies shared table wrappers and
      sortable table state.
    - `toolbar-controls.test.tsx` (`tests/components/toolbar-controls.test.tsx`): verifies toolbar
      controls behavior.
    - `tooltip.test.tsx` (`tests/components/tooltip.test.tsx`): verifies tooltip hover,
      keyboard-visible focus, viewport positioning, portal rendering, and close behavior.
  - `tests/features`: feature workflow, workspace behavior, saved-view, and ticket-service tests.
    - `ticket-article-signature-golden-fixtures.ts`,
      `ticket-article-signature-golden-fail-open-fixtures.ts`, and
      `ticket-article-signature-golden-support.ts` (`tests/features`): split positive and fail-open
      synthetic/redacted regression shapes plus typed-hint materialization helpers, without
      storing live article content.
    - `ticket-article-signature-golden.test.ts`
      (`tests/features/ticket-article-signature-golden.test.ts`): verifies fail-open boundary
      validation, over-broad provider-hint refinement, UI disclosure semantics, and shared
      conversation-history extraction across the golden corpus.
    - `workspace-communication-draft-controller.test.ts`
      (`tests/features/workspace-communication-draft-controller.test.ts`): verifies exact personal
      browser scope, memory-first publishing, local revisioning, restore, and storage-safe clear.
    - `tab-import-service.test.ts` (`tests/features/tab-import-service.test.ts`): verifies
      ownership and identity fail-closed behavior, read-only provider dispatch, ordering, and
      incompatible-contract handling.
    - `ticket-tab-import.test.tsx` (`tests/features/ticket-tab-import.test.tsx`): verifies
      explicit-only import, scoped hydration, concurrent local opens, exact-capacity behavior,
      import-wide failure feedback, bounded-scan feedback, and committed-result accounting.
    - `ticket-tab-import-hydration.test.ts`
      (`tests/features/ticket-tab-import-hydration.test.ts`): verifies import-wide failure
      short-circuiting, ticket-specific continuation, merged-target deduplication, and bounded
      candidate scanning.
    - `ticket-tab-import-lifecycle.test.tsx`
      (`tests/features/ticket-tab-import-lifecycle.test.tsx`): verifies unmount and workspace-scope
      cancellation prevent late hydration batches, tab imports, and feedback.
    - `ticket-communication-draft-runtime.test.ts`
      (`tests/features/ticket-communication-draft-runtime.test.ts`): verifies exact-scope
      synchronous draft presence and ordered IndexedDB work.
    - `ticket-workspace-local-tabs.test.tsx`
      (`tests/features/ticket-workspace-local-tabs.test.tsx`): verifies normal navigation is local
      and the provider import action runs only after pressing `Sync tabs`, without polluting
      recently viewed tickets.
    - `ai-ticket-summary-action.test.ts` (`tests/features/ai-ticket-summary-action.test.ts`):
      verifies scoped selected-ticket detail reload, blank-request rejection, and the single
      configuration re-read/auth-recovery retry.
    - `ticket-detail-connection-scope.test.ts`
      (`tests/features/ticket-detail-connection-scope.test.ts`): verifies explicit personal
      connection detail reads and fail-closed workspace/identity-scope mismatches.
    - `ai-ticket-summary-cache.test.ts` (`tests/features/ai-ticket-summary-cache.test.ts`):
      verifies generated selected-ticket AI summary output cache hit and write behavior without
      prompt persistence.
    - `ai-ticket-summary-cache-identity.test.ts`
      (`tests/features/ai-ticket-summary-cache-identity.test.ts`): verifies summary cache identity
      changes when the effective prompt changes.
    - `ai-ticket-summary-cache-test-helpers.ts`
      (`tests/features/ai-ticket-summary-cache-test-helpers.ts`): shared AI summary cache fixtures
      for ticket detail, runtime config, and cache repository tests.
    - `ai-ticket-summary.test.ts` (`tests/features/ai-ticket-summary.test.ts`): verifies read-only
      AI summary config defaults, sanitized prompt context, safe telemetry, and OpenAI-compatible
      and Anthropic-compatible request shapes.
    - `ai-settings-secret-preservation.test.ts`
      (`tests/features/ai-settings-secret-preservation.test.ts`): verifies blank AI secret edits
      preserve existing encrypted keys and reject corrupt stored secret envelopes.
    - `ai-settings-live-validation.test.ts`
      (`tests/features/ai-settings-live-validation.test.ts`): verifies workspace AI provider live
      validation success and failure mapping for supported protocol families.
    - `ai-settings-data-shape.test.ts` (`tests/features/ai-settings-data-shape.test.ts`):
      verifies workspace AI settings client-readable data hides admin-managed provider metadata
      from non-admin users while preserving configured status.
    - `ai-settings-service.test.ts` (`tests/features/ai-settings-service.test.ts`): verifies
      workspace AI runtime resolution, admin settings mutations, encrypted key storage,
      permissions, and generated-summary cache invalidation.
    - `ai-settings-service-test-helpers.ts`
      (`tests/features/ai-settings-service-test-helpers.ts`): shared AI settings service test
      repositories, connection fixtures, and form helpers.
    - `ai-settings-service-user.test.ts` (`tests/features/ai-settings-service-user.test.ts`):
      verifies user-provided AI key saves and live validation failure behavior.
    - `ai-prompts-overrides.test.ts` (`tests/features/ai-prompts-overrides.test.ts`): verifies
      workspace rephrase style override permissions, effective override resolution, and admin style
      creation.
    - `ai-prompts-test-helpers.ts` (`tests/features/ai-prompts-test-helpers.ts`): shared AI prompt
      and rephrase style repositories, settings, connection, cache, form, and user fixtures.
    - `ai-prompts-connection-repository.ts`
      (`tests/features/ai-prompts-connection-repository.ts`): focused shared-workspace connection
      repository fixture for AI prompt tests.
    - `ai-draft-rewrite-service.test.ts` (`tests/features/ai-draft-rewrite-service.test.ts`):
      verifies draft-only proofread/rephrase prompt composition, My Style inclusion, unavailable
      states, and injected provider behavior.
    - `ai-my-style-service.test.ts` (`tests/features/ai-my-style-service.test.ts`): verifies
      encrypted workspace-scoped My Style load/save/reset behavior, validation, membership
      permission, and unauthenticated guards.
    - `saved-view-management-permissions.test.ts`
      (`tests/features/saved-view-management-permissions.test.ts`): verifies saved view management
      permissions behavior.
    - `saved-view-management-test-helpers.ts`
      (`tests/features/saved-view-management-test-helpers.ts`): shared test helpers for saved view
      management test.
    - `saved-view-management.test.ts` (`tests/features/saved-view-management.test.ts`): verifies
      saved-view condition compilation, `My work` seed/default behavior, delete/default guardrails,
      and shared-view permissions.
    - `saved-view-persistence.test.ts` (`tests/features/saved-view-persistence.test.ts`): verifies
      saved view persistence sanitization, guardrails, and storage round-tripping.
    - `saved-view-workspace.test.ts` (`tests/features/saved-view-workspace.test.ts`): verifies
      workspace saved-view performance guardrails and provider-neutral disabled labels.
    - `selected-ticket-draft.test.ts` (`tests/features/selected-ticket-draft.test.ts`): verifies the
      selected-ticket draft shell, metadata dirty-field tracking, discard/reset copy behavior, and
      provider-neutral metadata submit payload construction.
    - `selected-ticket-communication-input.test.ts`
      (`tests/features/selected-ticket-communication-input.test.ts`): verifies strict parsing,
      sanitization, recipient normalization, and discriminated comment/reply update payloads.
    - `ticket-communication-audit.test.ts` (`tests/features/ticket-communication-audit.test.ts`):
      verifies communication audit logs preserve saved, saved-refresh-failed, and failed outcomes
      without logging raw ticket IDs, note/reply bodies, provider bodies, or customer content.
    - `ticket-communication-comments-workspace.test.tsx`
      (`tests/features/ticket-communication-comments-workspace.test.tsx`): verifies ticket
      communication comments workspace behavior.
    - `ticket-communication-ai-drafts-workspace.test.tsx`
      (`tests/features/ticket-communication-ai-drafts-workspace.test.tsx`): verifies local inline
      composer draft recovery, proofread suggestion persistence, and suggestion apply behavior.
    - `ticket-communication-ai-selection-workspace.test.tsx` and
      `ticket-rich-text-editor-selection.test.ts`: verify selection-only AI request content,
      surrounding rich-text preservation, toolbar-focus capture, stale-range rejection, and
      non-editable mention protection.
    - `ticket-communication-composer-focus-workspace.test.tsx`
      (`tests/features/ticket-communication-composer-focus-workspace.test.tsx`): verifies
      communication composers focus their editor and scroll only the ticket conversation.
    - `ticket-communication-draft-scope.test.ts`
      (`tests/features/ticket-communication-draft-scope.test.ts`): verifies drafts cannot cross
      users, workspaces, personal connections, identity versions, or legacy shared scopes.
    - `ticket-communication-workspace-test-utils.tsx`
      (`tests/features/ticket-communication-workspace-test-utils.tsx`): shared test utilities for
      ticket communication workspace.
    - `ticket-contextual-reply-workspace.test.tsx`
      (`tests/features/ticket-contextual-reply-workspace.test.tsx`): verifies footer latest-source
      behavior, older Reply all override, top composer placement, replacement confirmation, and
      managed-address warning.
    - `ticket-detail-action.test.ts` (`tests/features/ticket-detail-action.test.ts`): verifies
      ticket detail action behavior.
    - `ticket-detail-cache-service.test.ts`
      (`tests/features/ticket-detail-cache-service.test.ts`): verifies selected-ticket detail cache
      hits skip provider detail reads, provider refreshes write cache entries, and confirmed
      metadata writes invalidate cached detail before refresh.
    - `ticket-internal-note-action-input.test.ts`
      (`tests/features/ticket-internal-note-action-input.test.ts`): verifies selected-ticket
      communication payload parsing and unsupported-key rejection.
    - `ticket-internal-note-service.test.ts`
      (`tests/features/ticket-internal-note-service.test.ts`): verifies provider-neutral
      internal-note and customer-reply service dispatch, capability failures, and
      refresh-after-write results.
    - `ticket-internal-notes-workspace.test.tsx`
      (`tests/features/ticket-internal-notes-workspace.test.tsx`): verifies explicit internal-note
      and customer-reply submits, pending/error behavior, and selected-detail refresh after saved
      communication writes.
    - `ticket-link-modal-manual-workspace.test.tsx`
      (`tests/features/ticket-link-modal-manual-workspace.test.tsx`): verifies ticket link modal
      manual workspace behavior.
    - `ticket-link-modal-workspace.test.tsx`
      (`tests/features/ticket-link-modal-workspace.test.tsx`): verifies ticket link modal workspace
      behavior.
    - `ticket-list-action-saved-views.test.ts`
      (`tests/features/ticket-list-action-saved-views.test.ts`): verifies saved-view application,
      global/active connection scope, and rejected cross-connection workspace list page loads.
    - `ticket-list-action.test.ts` (`tests/features/ticket-list-action.test.ts`): verifies
      client-safe post-hydration workspace list page action results.
    - `ticket-search-action.test.ts` (`tests/features/ticket-search-action.test.ts`): verifies
      authenticated quick/detailed global search validation, paging, sorting, and provider-safe
      failure mapping.
    - `ticket-list-query-guardrails.test.ts`
      (`tests/features/ticket-list-query-guardrails.test.ts`): verifies provider-neutral list query
      capability derivation and unsupported or too-expensive query rejection before provider
      dispatch.
    - `ticket-metadata-action-input.test.ts`
      (`tests/features/ticket-metadata-action-input.test.ts`): verifies one selected-ticket update
      payload parsing, server-boundary validation, and pending date validation across primary
      metadata, secondary metadata, and staged communication fields.
    - `ticket-metadata-action-revalidation.test.ts`
      (`tests/features/ticket-metadata-action-revalidation.test.ts`): verifies successful metadata
      writes invalidate the workspace for saved and saved-refresh-failed action results.
    - `ticket-metadata-mutation-audit.test.ts`
      (`tests/features/ticket-metadata-mutation-audit.test.ts`): verifies mutation audit logs
      preserve saved-refresh-failed and failed outcomes without logging raw ticket IDs, metadata
      values, provider bodies, or customer content.
    - `ticket-metadata-mutation-service.test.ts`
      (`tests/features/ticket-metadata-mutation-service.test.ts`): verifies provider-neutral
      metadata mutation service dispatch, capability failures, pending-date validation,
      unavailable-transition handling, and refresh-after-write results.
    - `ticket-metadata-mutation-workspace.test.tsx`
      (`tests/features/ticket-metadata-mutation-workspace.test.tsx`): verifies workspace metadata
      mutation submit, hidden state options, pending date/time input, error, and staged
      non-optimistic UI behavior.
    - `ticket-pending-date-presets.test.tsx`
      (`tests/features/ticket-pending-date-presets.test.tsx`): verifies compact preset interaction,
      time preservation, visible-month movement, DST-safe day offsets, and month-end clamping.
    - `ticket-overdue-pending-priority-update.test.tsx`
      (`tests/features/ticket-overdue-pending-priority-update.test.tsx`): verifies overdue pending
      tickets can still submit priority-only staged metadata updates without resubmitting stale
      pending dates.
    - `ticket-reply-input.test.ts` (`tests/features/ticket-reply-input.test.ts`): verifies contextual
      reply address normalization, invalid/control rejection, To/Cc deduplication, required context,
      and absence of an application recipient ceiling.
    - `ticket-owner-group-metadata-service.test.ts`
      (`tests/features/ticket-owner-group-metadata-service.test.ts`): verifies owner and group
      metadata mutation dispatch and capability gating.
    - `ticket-owner-group-metadata-workspace.test.tsx`
      (`tests/features/ticket-owner-group-metadata-workspace.test.tsx`): verifies owner and group
      staged metadata controls submit through the shared Update action.
    - `saved-view-owner-group-compatibility.test.ts`
      (`tests/features/saved-view-owner-group-compatibility.test.ts`): verifies positive group union,
      negative-group behavior, current-user resolution, and fail-closed owner validation.
    - `ticket-post-update-navigation-workspace.test.tsx`
      (`tests/features/ticket-post-update-navigation-workspace.test.tsx`): verifies ticket post
      update navigation workspace behavior.
    - `ticket-rich-editor-behavior.test.tsx`
      (`tests/features/ticket-rich-editor-behavior.test.tsx`): verifies ticket rich editor behavior
      behavior.
    - `ticket-rich-editor-paragraphs.test.tsx`
      (`tests/features/ticket-rich-editor-paragraphs.test.tsx`): verifies ticket rich editor
      paragraphs behavior.
    - `ticket-rich-editor-submit-workspace.test.tsx`
      (`tests/features/ticket-rich-editor-submit-workspace.test.tsx`): verifies ticket rich editor
      submit workspace behavior.
    - `ticket-secondary-metadata-service.test.ts`
      (`tests/features/ticket-secondary-metadata-service.test.ts`): verifies tags, links, and
      subscription mutation dispatch and capability gating.
    - `ticket-secondary-metadata-workspace.test.tsx`
      (`tests/features/ticket-secondary-metadata-workspace.test.tsx`): verifies tags, related links,
      and subscription staged metadata controls submit through the shared Update action.
    - `ticket-service-provider-errors.test.ts`
      (`tests/features/ticket-service-provider-errors.test.ts`): verifies ticket service provider
      errors behavior.
    - `ticket-service-query.test.ts` (`tests/features/ticket-service-query.test.ts`): verifies
      ticket list query normalization, count requests, capability rejection, page-size constraining,
      and provider-boundary dispatch fields.
    - `ticket-service-test-helpers.ts` (`tests/features/ticket-service-test-helpers.ts`): shared
      ticket service test repository, provider, connection, and encryption fixtures.
    - `ticket-service.test.ts` (`tests/features/ticket-service.test.ts`): verifies ticket service
      behavior.
    - `ticket-personal-connection-boundary.test.ts`
      (`tests/features/ticket-personal-connection-boundary.test.ts`): proves membership without a
      personal connection fails before URL validation, provider cache access, or provider reads.
    - `ticket-staged-metadata-edge-workspace.test.tsx`
      (`tests/features/ticket-staged-metadata-edge-workspace.test.tsx`): verifies ticket staged
      metadata edge workspace behavior.
    - `ticket-staged-metadata-workspace.test.tsx`
      (`tests/features/ticket-staged-metadata-workspace.test.tsx`): verifies staged single-ticket
      metadata update behavior, changed-field treatment, discard, selected-ticket rebasing, and
      saved-refresh-failed UI handling.
    - `ticket-tab-metadata-sync.test.tsx` (`tests/features/ticket-tab-metadata-sync.test.tsx`):
      verifies a successful staged state update immediately updates the active tab bottom-accent state
      color before server refresh rehydrates the workspace.
    - `ticket-workspace-client-detail-cache.test.tsx`
      (`tests/features/ticket-workspace-client-detail-cache.test.tsx`): verifies selected-ticket
      detail cache refresh after metadata saves and cached-detail reuse when returning to an open
      ticket.
    - `ticket-workspace-client-detail-loader.test.tsx`
      (`tests/features/ticket-workspace-client-detail-loader.test.tsx`): verifies ticket workspace
      client detail loader behavior.
    - `ticket-workspace-detail-refresh.test.tsx`
      (`tests/features/ticket-workspace-detail-refresh.test.tsx`): verifies ticket workspace detail
      refresh behavior.
    - `ticket-workspace-grouping.test.tsx` (`tests/features/ticket-workspace-grouping.test.tsx`):
      verifies provider-backed workspace state/priority grouping and per-bucket pagination behavior.
    - `ticket-workspace-horizontal-tab-loading.test.tsx`
      (`tests/features/ticket-workspace-horizontal-tab-loading.test.tsx`): verifies ticket workspace
      horizontal tab loading behavior.
    - `ticket-workspace-horizontal-tab-reorder.test.tsx`
      (`tests/features/ticket-workspace-horizontal-tab-reorder.test.tsx`): verifies ticket workspace
      horizontal tab reorder behavior.
    - `ticket-workspace-horizontal-tab-pointer.test.tsx`
      (`tests/features/ticket-workspace-horizontal-tab-pointer.test.tsx`): verifies horizontal tab
      activation still works after minor pointer jitter.
    - `ticket-workspace-horizontal-tabs-helpers.ts`
      (`tests/features/ticket-workspace-horizontal-tabs-helpers.ts`): shared test helpers for ticket
      workspace horizontal tabs.
    - `ticket-workspace-horizontal-tabs.test.tsx`
      (`tests/features/ticket-workspace-horizontal-tabs.test.tsx`): verifies local horizontal ticket
      tab sizing, open/close/activation behavior, route navigation, restored saved tabs, direct-link
      tab merge, and persisted tab state writes.
    - `ticket-workspace-lookup-data.test.tsx`
      (`tests/features/ticket-workspace-lookup-data.test.tsx`): verifies ticket workspace lookup
      data behavior.
    - `ticket-workspace-notifications-recent.test.tsx`
      (`tests/features/ticket-workspace-notifications-recent.test.tsx`): verifies ticket workspace
      notifications recent behavior.
    - `ticket-workspace-notifications.test.tsx`
      (`tests/features/ticket-workspace-notifications.test.tsx`): verifies ticket workspace
      notifications behavior.
    - `ticket-workspace-notifications-errors.test.tsx`
      (`tests/features/ticket-workspace-notifications-errors.test.tsx`): verifies rejected
      notification read/mark-read requests are handled without unhandled rejections.
    - `ticket-workspace-paging-refreshed-rows.test.tsx`
      (`tests/features/ticket-workspace-paging-refreshed-rows.test.tsx`): verifies ticket workspace
      paging refreshed rows behavior.
    - `ticket-workspace-paging-sort.test.tsx`
      (`tests/features/ticket-workspace-paging-sort.test.tsx`): verifies post-hydration ungrouped
      list page loading, refreshed baseline row merging, provider-backed sorting, and grouped reload
      behavior.
    - `ticket-workspace-complete-name-sort.test.tsx`
      (`tests/features/ticket-workspace-complete-name-sort.test.tsx`): verifies Owner display-name
      sorting loads and orders the complete matching ticket result before showing its first window.
    - `ticket-table-display-sort.test.ts`
      (`tests/features/ticket-table-display-sort.test.ts`): verifies natural relationship-label
      ordering and stable placement of unassigned values.
    - `ticket-table-layout.test.ts` (`tests/features/ticket-table-layout.test.ts`): verifies shared
      List/Search tracks retain preferred widths without an intrinsic minimum that overflows the
      workspace pane.
    - `ticket-workspace-sorted-server-refresh.test.tsx`
      (`tests/features/ticket-workspace-sorted-server-refresh.test.tsx`): verifies ticket-removing
      server refreshes retain and reapply the active provider sort.
    - `ticket-workspace-saved-views.test.tsx`
      (`tests/features/ticket-workspace-saved-views.test.tsx`): verifies workspace saved-view
      selection and unsupported options.
    - `ticket-workspace-search.test.tsx`
      (`tests/features/ticket-workspace-search.test.tsx`): verifies debounced provider-backed quick
      search, detailed result activation, clear behavior, paging, and stale-response suppression.
    - `ticket-workspace-selected-detail.test.tsx`
      (`tests/features/ticket-workspace-selected-detail.test.tsx`): verifies selected ticket detail,
      thread rendering, secondary metadata chips/links, article recipients, and attachment display.
    - `ticket-ai-summary-panel.test.tsx`
      (`tests/features/ticket-ai-summary-panel.test.tsx`): verifies structured operational-brief
      sections, semantic timeline dates, visual rail, and omission of unavailable optional sections.
    - `ticket-workspace-selected-detail-ai.test.tsx`
      (`tests/features/ticket-workspace-selected-detail-ai.test.tsx`): verifies selected-ticket AI
      summary generation, cache hydration display, forced regeneration, and ticket-switch resets.
    - `ticket-workspace-ai-settings.test.tsx`
      (`tests/features/ticket-workspace-ai-settings.test.tsx`): verifies Settings AI section
      visibility and save behavior for admins, admin-managed users, and user-provided-key users.
    - `ticket-workspace-ai-settings-model.test.tsx`
      (`tests/features/ticket-workspace-ai-settings-model.test.tsx`): verifies saved custom AI model
      IDs submit unchanged from Settings.
    - `ticket-workspace-ai-active-switch.test.tsx`
      (`tests/features/ticket-workspace-ai-active-switch.test.tsx`): verifies the open Settings
      dialog reloads AI settings after the active workspace changes.
    - `ticket-workspace-ai-admin-user-key.test.tsx`
      (`tests/features/ticket-workspace-ai-admin-user-key.test.tsx`): verifies admins can save
      their own user-scoped per-workspace AI key when the workspace requires user-provided keys.
    - `ticket-workspace-prompt-center.test.tsx`
      (`tests/features/ticket-workspace-prompt-center.test.tsx`): verifies Prompt Center visibility,
      workspace prompt editing, and admin workspace rephrase style controls.
    - `ticket-workspace-prompt-center-access.test.tsx`
      (`tests/features/ticket-workspace-prompt-center-access.test.tsx`): verifies Prompt Center
      visibility for non-admin personal style override access.
    - `ticket-workspace-settings.test.tsx` (`tests/features/ticket-workspace-settings.test.tsx`):
      verifies Settings Views default updates and workspace creation behavior.
    - `ticket-workspace-profile-settings.test.tsx`
      (`tests/features/ticket-workspace-profile-settings.test.tsx`): verifies My Profile account,
      avatar upload, and password behavior.
    - `ticket-workspace-my-style-settings.test.tsx`
      (`tests/features/ticket-workspace-my-style-settings.test.tsx`): verifies Workspace Settings
      My Style visibility, save/reset behavior, and hidden state when workspace AI is disabled.
    - `ticket-workspace-test-utils.tsx` (`tests/features/ticket-workspace-test-utils.tsx`): shared
      provider-backed workspace fixtures and render helpers for feature tests.
    - `ticket-workspace-url-sync.test.tsx` (`tests/features/ticket-workspace-url-sync.test.tsx`):
      verifies direct initial selected-ticket URLs, explicit ticket link copying, and local
      ticket/List URL replacement for already-open tab activation and active-tab close fallback
      behavior.
    - `ticket-workspace-vertical-tabs.test.tsx`
      (`tests/features/ticket-workspace-vertical-tabs.test.tsx`): verifies local vertical ticket tab
      orientation, open/activation behavior, and route navigation without persistence.
    - `ticket-workspace-vertical-tabs-cache.test.tsx`
      (`tests/features/ticket-workspace-vertical-tabs-cache.test.tsx`): verifies older vertical
      ticket tabs reactivate cached details without route pushes.
    - `ticket-workspace.test.tsx` (`tests/features/ticket-workspace.test.tsx`): verifies
      provider-backed workspace unavailable, table, profile menu, read-only metadata, and list
      controls behavior.
    - `ticket-workspace-personal-connection.test.tsx`
      (`tests/features/ticket-workspace-personal-connection.test.tsx`): verifies a selected shared
      workspace without a personal connection renders only the connection requirement.
    - `workspace-connection-form-isolation.test.tsx`
      (`tests/features/workspace-connection-form-isolation.test.tsx`): verifies workspace admins
      can edit shared metadata independently while agents must supply their own credentials.
    - `workspace-adapter.test.ts` (`tests/features/workspace-adapter.test.ts`): verifies
      ticket-to-workspace adapter display formatting for table/detail/thread date strings.
    - `workspace-notifications-service.test.ts`
      (`tests/features/workspace-notifications-service.test.ts`): verifies workspace notifications
      service behavior.
    - `workspace-tab-actions.test.ts` (`tests/features/workspace-tab-actions.test.ts`): verifies the
      workspace tab server action validates state and writes through the active helpdesk connection.
    - `workspace-tab-state.test.ts` (`tests/features/workspace-tab-state.test.ts`): verifies
      persisted workspace tab state parsing guardrails, dedupe, and cap behavior.
  - `tests/providers`: provider plugin behavior tests.
    - `tests/providers/zammad`: Zammad provider mapping, API behavior, mutation, lookup, and read
      tests.
      - `credentials.test.ts` (`tests/providers/zammad/credentials.test.ts`): verifies
        provider-specific Basic Auth credential helpers.
      - `customer-replies.test.ts` (`tests/providers/zammad/customer-replies.test.ts`): verifies
        contextual reply revalidation, subject/thread payloads, and no-POST stale failure behavior.
      - `internal-notes.test.ts` (`tests/providers/zammad/internal-notes.test.ts`): verifies Zammad
        internal note and customer reply article payloads and provider-safe request usage.
      - `link-targets.test.ts` (`tests/providers/zammad/link-targets.test.ts`): verifies link
        targets behavior.
      - `lookups.test.ts` (`tests/providers/zammad/lookups.test.ts`): verifies group, owner, and
        group-scoped mention lookup behavior.
      - `mapping.test.ts` (`tests/providers/zammad/mapping.test.ts`): verifies provider-specific raw
        state and priority mapping to canonical ticket keys.
      - `mutation-policy.test.ts` (`tests/providers/zammad/mutation-policy.test.ts`): verifies
        Zammad-only state mutation availability constraints.
      - `mutations.test.ts` (`tests/providers/zammad/mutations.test.ts`): verifies Zammad state,
        priority, owner, and group metadata write payload mapping, orphan pending-time rejection,
        and provider-safe request usage.
      - `notifications.test.ts` (`tests/providers/zammad/notifications.test.ts`): verifies
        notifications behavior.
      - `read-assets.test.ts` (`tests/providers/zammad/read-assets.test.ts`): verifies Zammad
        attachment metadata, expanded user, and organization asset mapping for ticket detail.
      - `article-attachments.test.ts` (`tests/providers/zammad/article-attachments.test.ts`):
        verifies Zammad-visible attachment parity for body alternatives, raw CID references,
        transformed inline URLs, and unreferenced inline-disposition files.
      - `read-detail.test.ts` (`tests/providers/zammad/read-detail.test.ts`): verifies Zammad ticket
        detail and article-thread endpoint calls, optional feature defaults, sanitization, and
        detail read timing.
      - `read-helpers.ts` (`tests/providers/zammad/read-helpers.ts`): shared Zammad read test
        fixtures.
      - `read-list-users.test.ts` (`tests/providers/zammad/read-list-users.test.ts`): verifies
        Zammad ticket list user and organization fallback lookups when expanded assets are absent.
      - `read-lookup-assets.test.ts` (`tests/providers/zammad/read-lookup-assets.test.ts`): verifies
        Zammad group/state/priority fallback dictionaries and user display-name lookup behavior.
      - `read.test.ts` (`tests/providers/zammad/read.test.ts`): verifies Zammad ticket list endpoint
        calls, search-backed total counts and grouped bucket counts, canonical list mapping, and
        read timing.
      - `reply-context.test.ts` (`tests/providers/zammad/reply-context.test.ts`): verifies Zammad
        customer/agent/system routing, Reply-To, managed-address removal, To/Cc placement,
        Reply-all availability, deduplication, and web/phone fallbacks.
      - `secondary-mutations.test.ts` (`tests/providers/zammad/secondary-mutations.test.ts`):
        verifies Zammad tag, related-link, and subscription metadata write endpoint payloads.
      - `subscription-diagnostics.test.ts`
        (`tests/providers/zammad/subscription-diagnostics.test.ts`): verifies Zammad subscription
        secondary-read fallback diagnostics for current-user and mentions endpoint failures or
        malformed responses.
      - `subscription-mutations.test.ts` (`tests/providers/zammad/subscription-mutations.test.ts`):
        verifies subscription mutations behavior.
      - `taskbar-import.test.ts` (`tests/providers/zammad/taskbar-import.test.ts`): verifies pinned
        taskbar parsing, desktop ticket-only exposure, ordering, deduplication, fail-closed
        validation, and the absence of provider writes.
      - `ticket-search-query.test.ts` (`tests/providers/zammad/ticket-search-query.test.ts`):
        verifies Zammad-owned compilation of provider-neutral saved-view filters and raw global
        full-text expressions, including immutable merged-ticket exclusion.
      - `validation.test.ts` (`tests/providers/zammad/validation.test.ts`): verifies
        provider-specific Basic Auth validation request behavior.
  - `tests/unit`: focused unit tests for auth, security, registry, and core contracts.
    - `auth-service.test.ts` (`tests/unit/auth-service.test.ts`): verifies registration, login,
      session, logout, and expired-session cleanup use cases.
    - `auth-service-profile.test.ts` (`tests/unit/auth-service-profile.test.ts`): verifies profile
      name, avatar upload, password change, and password-change validation use cases.
    - `auth-service-test-helpers.ts` (`tests/unit/auth-service-test-helpers.ts`): shared in-memory
      auth repository used by auth service unit tests.
    - `auth-validation.test.ts` (`tests/unit/auth-validation.test.ts`): verifies email normalization
      and password input validation.
    - `base-url-validation.test.ts` (`tests/unit/base-url-validation.test.ts`): verifies helpdesk
      base URL and SSRF validation rules.
    - `encryption.test.ts` (`tests/unit/encryption.test.ts`): verifies secret envelope encryption.
    - `global-styles.test.ts` (`tests/unit/global-styles.test.ts`): verifies global styles behavior.
    - `ticket-search.test.ts` (`tests/unit/ticket-search.test.ts`): verifies provider-neutral global
      search trimming, length, control-character, and advanced-syntax preservation rules.
    - `helpdesk-connections-security.test.ts` (`tests/unit/helpdesk-connections-security.test.ts`):
      verifies personal connection ownership, membership-only denial, connection tamper
      resistance, and active-workspace security rules.
    - `helpdesk-connections-service-create-update.test.ts`
      (`tests/unit/helpdesk-connections-service-create-update.test.ts`): verifies connection
      creation, credential preservation, encryption, and metadata trimming behavior.
    - `helpdesk-connections-service-helpers.ts`
      (`tests/unit/helpdesk-connections-service-helpers.ts`): in-memory repository, provider
      registry, and form helpers shared by helpdesk connection service tests.
    - `helpdesk-connections-service-lifecycle.test.ts`
      (`tests/unit/helpdesk-connections-service-lifecycle.test.ts`): verifies active connection
      clearing for disable/delete lifecycle operations.
    - `helpdesk-connections-service-validation.test.ts`
      (`tests/unit/helpdesk-connections-service-validation.test.ts`): verifies existing-connection
      provider identity validation, duplicate identity rejection, error handling, and safe
      diagnostics.
    - `provider-boundary.test.ts` (`tests/unit/provider-boundary.test.ts`): verifies direct Zammad
      imports and raw Zammad tokens stay out of core, UI, feature, and provider-neutral code.
    - `provider-http-json.test.ts` (`tests/unit/provider-http-json.test.ts`): verifies provider JSON
      requests use pinned validated addresses, bounded response parsing, and safe JSON write request
      handling.
    - `provider-http.test.ts` (`tests/unit/provider-http.test.ts`): verifies provider requests
      reject DNS rebinding and use pinned validated addresses.
    - `provider-registry.test.ts` (`tests/unit/provider-registry.test.ts`): verifies provider
      registry lookup and duplicate-key protection.
    - `sanitize-html.test.ts` (`tests/unit/sanitize-html.test.ts`): verifies provider HTML
      sanitization.
    - `session-cookie.test.ts` (`tests/unit/session-cookie.test.ts`): verifies secure session cookie
      options.
    - `ticket-contract.test.ts` (`tests/unit/ticket-contract.test.ts`): verifies canonical ticket
      state and priority keys, labels, categories, and ranks.
    - `ticket-list-query.test.ts` (`tests/unit/ticket-list-query.test.ts`): verifies
      provider-neutral ticket list query defaults, normalization, count/group shapes, page-size
      guardrails, and unknown provider-specific field stripping.
    - `workspace-date-time-format.test.ts` (`tests/unit/workspace-date-time-format.test.ts`):
      verifies shared workspace date/time formatting omits the current year and uses 24-hour time.
  - `setup.ts` (`tests/setup.ts`): component test cleanup and DOM matcher setup.
