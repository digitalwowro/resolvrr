# Read-Only AI Contract

Read-only AI is an optional workspace capability for internal support-agent
summaries. It never writes to the helpdesk provider and never sends customer
communication.

## Scope

- Selected-ticket summary generation from an explicit agent click.
- Server-side ticket detail reload before prompt preparation.
- Provider-neutral, sanitized ticket metadata and thread text only.
- Disabled-by-default runtime configuration.
- No durable AI output cache in this phase.

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
the prompt from normalized data.

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
- cached generated summaries from a previous phase;
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

This phase stores no generated AI output. The future persistent output cache
phase must key generated text on prompt contract version, model identity,
selected-ticket identity, source freshness, sanitization version, user and
permission scope, and relevant source updates.
