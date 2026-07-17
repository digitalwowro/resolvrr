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

The selected-ticket summary action accepts the ticket external ID plus the
workspace and personal helpdesk connection that rendered it. The server
ownership-checks that scope and rejects mismatches instead of resolving the
user's potentially newer globally active workspace. It then reloads the ticket
through the provider-neutral ticket read service and builds the prompt from
normalized data. The summary cache is checked only after this provider-source
detail reload and prompt-context construction.

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
and whether admins may edit the workspace default. The selected-ticket summary
prompt is workspace admin-managed so summary output stays governed by the
workspace.

Prompt defaults are scoped to the active workspace and managed from `Avatar ->
Settings -> Prompt Center` when AI is enabled. Prompt bodies are encrypted at
rest with `APP_ENCRYPTION_KEY`. Prompt Center also owns workspace rephrase
styles and safety/guardrail instructions for draft-focused operations. Personal
rephrase style overrides are separate user/workspace/style records and do not
apply to selected-ticket summary generation.

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
After one authentication rejection, the summary action re-reads the scoped
configuration and makes at most one delayed retry. Only a second authentication
rejection is returned as a credential failure; other retry outcomes retain
their own failure classification.

## Telemetry

AI telemetry is metadata-only. It may record the operation, phase, provider
protocol family, cache data kind, cache event, freshness age bucket, duration,
numeric provider HTTP status, a bounded opaque configuration version, safe
provider error code/type tokens, status, unavailable reason, and retryability.
It must not record prompts,
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

Every coordinated selected-ticket detail load may read an existing cached
summary after ticket detail, workspace AI config, and effective prompt identity
are known. This hydration is cache-only: it must not call the AI provider,
generate text, or write a new cache entry. The client detail cache retains a
hydrated or newly generated summary while its ticket remains loaded, so tab
switching does not discard it. The explicit summary action remains the only
path that may generate AI output and store a new summary cache entry. Its
default Generate behavior may reuse a valid cache hit, while Regenerate must
force a provider call and overwrite the cached summary after successful
generation.

Tab switching, background refresh, and local state changes must not trigger AI
provider calls. A detail refresh may perform the same cache-only hydration. A
temporary summary-cache read failure must not block otherwise available ticket
detail or erase a summary already retained by the client; a confirmed cache
miss remains authoritative.

Generated summary cache entries are invalidated when confirmed provider writes
change the selected ticket/thread source, when the helpdesk connection is
updated, validated, disabled, or deleted, and when workspace/user AI settings
change in a way that could alter provider protocol, model, or available key.
