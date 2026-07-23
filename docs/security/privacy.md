# Security And Privacy Model

Resolvrr stores local settings and encrypted provider connection credentials.
The connected helpdesk provider remains the source of truth for tickets and
conversation content.

## Credentials

- Resolvrr users authenticate with email/password and server-side SQL sessions.
- Passwords are hashed with Argon2id.
- Browser storage receives only the http-only `resolvrr_session` cookie.
- SQL stores only a hash of the session token.
- A Workspace stores shared provider type, canonical helpdesk URL, memberships,
  saved views, AI configuration, and workspace UI settings. It stores no shared
  provider credential.
- Each helpdesk connection belongs to exactly one Resolvrr user and one
  workspace. Its encrypted credential and validated provider identity are
  personal; membership, workspace administration, global administration, and
  workspace ownership never authorize another user's credential.
- A signed-in user without an active personal connection fails closed before
  credential decryption, cache access, or a provider request. There is no owner
  credential fallback.
- AI provider API keys are stored server-side, encrypted at rest, and scoped to
  either the active workspace default or a user plus workspace. They are managed
  from `Avatar -> Settings -> AI Settings`.
- Non-admin AI settings state may expose whether admin-managed AI is configured
  for the active workspace, but not the workspace provider URL, model, protocol,
  or key status metadata.
- Provider and AI credentials must never be stored in cookies, localStorage,
  sessionStorage, or client-readable state.
- Ticket composer draft recovery uses versioned browser-local IndexedDB for the
  unsent communication kind, source/intent/context version, To/Cc selection,
  draft text, and a small AI suggestion history. It must not store credentials,
  provider message IDs, or raw provider payloads. Draft identity includes user,
  workspace, personal connection, connection identity version, and ticket;
  legacy shared-credential drafts are never restored or transferred.

## Provider Data

- Cache only the provider data needed for list/detail performance.
- Do not cache full provider responses by default.
- If sensitive ticket/thread content must be cached, store sanitized normalized
  content and encrypt sensitive body fields at rest.
- The current durable provider cache stores selected-ticket detail/thread
  snapshots as encrypted normalized payloads scoped by user, active helpdesk
  connection, provider ticket identity, and source version. Shared workspace
  membership alone cannot select or read another member's cache. It does not cache
  raw provider payloads, provider request/response bodies, or background sync
  data.
- Ticket-detail cache source version `v6` invalidates pre-hint article snapshots.
  Refreshed encrypted records may contain typed provider-neutral signature hint
  offsets tied to their sanitized HTML, but never raw provider signature fields,
  classes, or unsanitized message bodies.
- Merged source cache records are invalidated and never copied to the surviving
  ticket. Only the final provider-neutral detail may be cached under the final
  ticket identity.
- The cache and freshness contract lives in
  `docs/architecture/cache-and-privacy-contract.md`. Durable provider cache,
  generated output cache, background sync, and webhooks must follow that
  contract.
- Logs may include safe metadata such as provider key, connection id,
  capability, communication kind, mutation field names, field counts, status,
  retryability, and timing. Logs must not include credentials, tokens,
  passwords, cookies, raw provider payloads, provider response bodies, mutation
  request bodies, provider-local ticket or linked-ticket IDs, article IDs,
  recipient addresses, internal note bodies, customer reply bodies, or customer
  message bodies.
- Provider mutation audit rows are local accountability metadata and are not
  provider content. Removing a user with provider write history deactivates and
  scrubs the user record instead of deleting those audit rows. Helpdesk-provider
  replies and articles remain in the connected provider and are never deleted by
  Resolvrr user removal. Historical rows retain workspace identity separately;
  deleting a personal connection clears only its optional connection reference.
- Provider identity external IDs and display labels are used only to bind one
  personal connection and prevent duplicate users from linking the same
  provider account within a workspace. Identities, usernames, credentials, and
  raw current-user responses must not be logged.

## AI Prompt And Output Data

- AI Assistant features are a core v1 product capability and must use sanitized
  provider-neutral source data.
- AI runtime configuration is resolved from the active workspace policy:
  disabled, admin-managed workspace key, or user-provided per-workspace key.
  There is no app-wide AI key in v1.
- Read-only selected-ticket summaries are bound to an ownership-checked
  workspace and personal connection, reload ticket detail on the server, then
  use selected-ticket metadata and sanitized thread text only under the
  cache/freshness rules in the architecture contract.
- V1 AI Assistant operations use selected-ticket metadata and sanitized thread
  text only. Linked tickets, saved views, customer-wide history, knowledge base
  content, workspace-wide search results, and arbitrary provider records are not
  v1 AI context.
- Prompts, generated summaries, draft suggestions, generated replies, My Style
  text, and reviewed-action suggestions must not be logged.
- Global ticket search terms and result contents must not be logged, placed in
  URLs, or persisted server-side. Session storage may retain only the query,
  scoped by user, workspace, personal connection, and identity version.
- AI telemetry may include only operation, phase, provider protocol family,
  numeric provider HTTP status, a bounded opaque configuration version, safe
  provider error code/type tokens, duration, status, unavailable reason, and
  retryability. It must not include
  provider request bodies, provider response bodies, provider credentials, model
  names, ticket IDs, article IDs, customer names, email addresses, prompts,
  generated summaries, draft suggestions, generated replies, My Style text,
  reviewed-action suggestions, or ticket/thread content.
- Generated selected-ticket summaries may be cached server-side as encrypted
  output scoped by user, active helpdesk connection, selected ticket,
  source fingerprint/freshness, prompt version, sanitization version, provider
  protocol, and model fingerprint. Prompt text, raw provider payloads, model
  names, and generated summaries must not be logged.
- Workspace AI prompt defaults, workspace rephrase style prompts, and personal
  rephrase style overrides are encrypted at rest when they contain authored
  prompt text. Prompt bodies must not be logged or exposed outside the settings
  UI that is authorized to edit them.
- My Style is user-specific writing guidance scoped to a workspace. It is
  private to the owning user, encrypted at rest, and structured around role,
  audience, tone, writing preferences, and constraints. Admins can manage
  workspace AI policy, draft-operation base prompts, supplemental ticket-summary
  guidance, and workspace rephrase styles, but they cannot replace the
  code-owned ticket-summary safety contract or view another user's My Style
  content. My Style must follow the same no-logging posture as prompts and
  generated output.
- Proofread operations use the current composer draft and workspace-scoped My
  Style only. Rephrase operations also use the selected workspace rephrase style
  prompt or a permitted personal override for that style. They do not include
  selected-ticket thread context and do not write to the helpdesk provider.
- Future suggested-reply and source-aware drafting operations must use a fresh
  server-side provider read of the selected ticket before prompt construction.
  They must not generate from stale client state or stale persistent cache.
- Browser-local draft recovery may retain unsent comment/reply text, reviewed
  To/Cc recipients, contextual source/version data, and a small suggestion
  history for the current user/workspace/ticket. Validation, provider,
  partial-success, and uncertain-delivery failures retain it; confirmed success,
  explicit discard/close, or retention expiry clears it.
- Manual ticket-tab import is bound to the signed-in user's personal connection
  and exact identity version. Membership alone cannot read another user's
  provider tabs or credentials. The provider response is used transiently and
  is not persisted; telemetry contains only status, duration, retryability, and
  aggregate counts, never ticket IDs, titles, or raw taskbar payloads.
- Reviewed agentic actions may prepare suggestions for existing
  provider-neutral update paths, but provider writes still require explicit user
  review and the normal submit/update path.
- Customer-visible communication still happens only through the selected
  helpdesk provider after explicit user review and submit.
- Workspace signature policy is shared configuration. Resolvrr-managed template
  bodies and revision snapshots are encrypted at rest; provider-managed raw
  signature records never leave the provider boundary. The browser receives only
  sanitized rendered preview HTML and bounded inlined signature images. Signature
  bodies, variables after rendering, provider signature IDs, image bytes, and
  provider responses must never be logged.
- A retired merged-ticket tombstone exposes neither source content nor raw
  provider/history identifiers, and it offers no provider mutation or AI action.
