# Read-Only AI Contract

This document describes the implemented selected-ticket summary slice of the
broader AI Assistant v1 product surface defined in
`docs/architecture/ai-v1-product-surface.md`. Summaries are read-only advisory
output. They never write to the helpdesk provider and never send customer
communication.

## Scope

- Selected-ticket summary generation from an explicit agent click.
- Server-side ticket detail reload before prompt preparation.
- Provider-neutral, sanitized ticket metadata and thread text only.
- Workspace-scoped runtime configuration controlled by workspace AI policy.
- Durable selected-ticket summary cache for successful generated summaries.

## Boundaries

- AI runtime code lives outside helpdesk provider plugins.
- Helpdesk provider code remains responsible only for helpdesk reads and writes.
- Core, workspace UI, and ticket features must not branch on helpdesk provider
  names for AI behavior.
- Rendering, route loading, background refresh, and local state changes must not
  trigger AI requests.

The selected-ticket summary action accepts only the ticket external ID from the
client. It reloads the current user's active selected-ticket detail on the
server through the existing provider-neutral ticket read service, then builds
the prompt from normalized data. The summary cache is checked only after this
provider-source detail reload and prompt-context construction.

## Prompt Data

Allowed prompt input:

- ticket number, title, state, priority, owner, group, tags, timestamps;
- provider-neutral article visibility, direction, author label, and timestamp;
- plain text derived from provider-sanitized article HTML.

Prompt input must not include:

- provider credentials, cookies, tokens, auth headers, or endpoint URLs;
- raw provider request or response bodies;
- raw provider article IDs;
- attachment bytes or provider attachment URLs;
- unsanitized HTML;
- customer reply drafts. Drafting and reply-generation prompts are separate AI
  Assistant contracts, not selected-ticket summary context.

## Runtime Configuration

AI runtime configuration is scoped to the active helpdesk connection, which the
UI presents as the active workspace. It is managed from `Avatar -> Settings ->
AI Settings`.

Workspace AI policy can be:

- `disabled`: summary generation returns an AI-disabled setup state.
- `admin-managed`: admins save the workspace default provider settings and API
  key; users see status only.
- `user-provided`: each user must save their own provider settings and API key
  for that workspace.

There is no app-wide AI provider key in v1. Saved workspace and user API keys
are encrypted at rest with `APP_ENCRYPTION_KEY`. Empty secret fields on edit
preserve the existing saved key. Saves validate required fields, require HTTPS
base URLs, and run a live provider validation request before persistence.
Runtime AI provider calls revalidate the configured HTTPS base URL and use the
same pinned-address, redirect-free server HTTP boundary as helpdesk provider
requests.

Supported protocol families:

- `openai-compatible`: sends a Chat Completions request to the configured HTTPS
  base URL plus `/chat/completions`.
- `anthropic-compatible`: sends a Messages request to the configured HTTPS base
  URL plus `/messages`.

Protocol support is about request/response shape, not helpdesk provider
identity. API keys must stay server-side and must not be exposed to client
state, public logs, or generated output.

## Prompt Configuration

AI prompt operations are registered in code before they can be edited or used.
Each registered prompt defines its stable key, built-in default, maximum length,
and whether user-specific overrides are allowed. The selected-ticket summary
prompt is admin-managed only so summary output stays consistent across users.

Prompt defaults are scoped to the active workspace and managed from `Avatar ->
Settings -> Prompt Center` when AI is enabled. Prompt bodies are encrypted at
rest with `APP_ENCRYPTION_KEY`. Admins may allow personal prompt overrides for
future prompt operations that the code registry marks as user-overridable.
Turning that workspace option off preserves saved user prompt rows but makes
admin defaults the only effective prompts. Stored user prompts must not be read
as effective prompts while the option is off.

Selected-ticket summary generation resolves only the workspace/admin summary
prompt, then combines it with the server-built provider-neutral ticket context.
The ticket context remains non-editable and is still generated from sanitized
ticket data on the server.

## Failure Behavior

The summary UI reports disabled, missing workspace configuration, missing user
configuration, invalid saved configuration, provider auth failure, rate limit,
temporary provider failure, or ticket-unavailable states without exposing raw
provider responses. Failed AI calls must not alter the selected-ticket draft,
ticket metadata, thread, open tabs, saved views, or helpdesk provider state.

## Telemetry

AI telemetry is metadata-only. It may record the operation, phase, provider
protocol family, cache data kind, cache event, freshness age bucket, duration,
status, unavailable reason, and retryability. It must not record prompts,
generated summaries, provider request bodies, provider response bodies,
provider credentials, model names, ticket IDs, article IDs, customer names,
email addresses, or ticket/thread content.

## Caching

Successful selected-ticket summaries may be cached in encrypted server-side
storage. Cache keys include prompt contract version, effective prompt text
fingerprint, model identity fingerprint, selected-ticket identity, source
fingerprint/freshness, sanitization version, user, and active helpdesk
connection. Prompt text, raw provider payloads, model names, and generated
summaries must not be logged.

The cache is read only from the explicit summary action. Rendering, route
loading, tab switching, background refresh, and local state changes must not
trigger cache reads that generate AI output or AI provider calls.

Generated summary cache entries are invalidated when confirmed provider writes
change the selected ticket/thread source, when the helpdesk connection is
updated, validated, disabled, or deleted, and when workspace/user AI settings
change in a way that could alter provider protocol, model, or available key.
