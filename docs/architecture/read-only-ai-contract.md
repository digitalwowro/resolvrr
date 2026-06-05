# Read-Only AI Contract

Read-only AI is an optional workspace capability for internal support-agent
summaries. It never writes to the helpdesk provider and never sends customer
communication.

## Scope

- Selected-ticket summary generation from an explicit agent click.
- Server-side ticket detail reload before prompt preparation.
- Provider-neutral, sanitized ticket metadata and thread text only.
- Disabled-by-default runtime configuration.
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
- customer reply drafts unless a later approved phase explicitly defines that
  prompt contract.

## Runtime Configuration

AI is disabled unless `AI_PROVIDER` selects a configured protocol and the
matching model and API key are present.

Supported protocol families:

- `openai-compatible`: sends a Chat Completions request to
  `AI_OPENAI_BASE_URL/chat/completions`.
- `anthropic-compatible`: sends a Messages request to
  `AI_ANTHROPIC_BASE_URL/messages`.

Protocol support is about request/response shape, not helpdesk provider
identity. API keys must stay server-side and must not be exposed to client
state, public logs, or generated output.

## Failure Behavior

The summary UI reports disabled, missing config, provider auth failure, rate
limit, temporary provider failure, or ticket-unavailable states without exposing
raw provider responses. Failed AI calls must not alter the selected-ticket
draft, ticket metadata, thread, open tabs, saved views, or helpdesk provider
state.

## Telemetry

AI telemetry is metadata-only. It may record the operation, phase, provider
protocol family, duration, status, unavailable reason, and retryability. It must
not record prompts, generated summaries, provider request bodies, provider
response bodies, provider credentials, model names, ticket IDs, article IDs,
customer names, email addresses, or ticket/thread content.

## Caching

Successful selected-ticket summaries may be cached in encrypted server-side
storage. Cache keys include prompt contract version, model identity fingerprint,
selected-ticket identity, source fingerprint/freshness, sanitization version,
user, and active helpdesk connection. Prompt text, raw provider payloads, model
names, and generated summaries must not be logged.

The cache is read only from the explicit summary action. Rendering, route
loading, tab switching, background refresh, and local state changes must not
trigger cache reads that generate AI output or AI provider calls.

Generated summary cache entries are invalidated when confirmed provider writes
change the selected ticket/thread source or when the helpdesk connection is
updated, validated, disabled, or deleted.
