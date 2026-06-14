# AI Source, Privacy, And Review Contract

This contract applies to AI drafting, reply, and reviewed-action features. It
complements the implemented read-only selected-ticket summary contract and
keeps AI behavior bounded as assisted AI grows.

## Source Data

V1 AI Assistant operations may use only selected-ticket provider-neutral source
data:

- ticket number, title, state, priority, owner, group, tags, timestamps, links,
  and subscription state where already normalized;
- provider-neutral article visibility, direction, author label, timestamp, and
  sanitized plain text derived from article HTML;
- the user's current draft text for proofread and rephrase operations;
- workspace-scoped My Style fields only for operations whose contract
  explicitly allows personal style;
- the selected workspace rephrase style prompt or permitted personal override
  for rephrase operations.

V1 AI operations must not use linked-ticket bodies, saved views, knowledge base
content, customer-wide history, arbitrary workspace search results, attachment
bytes, raw provider payloads, provider URLs, credentials, provider-local article
IDs, or unsanitized HTML.

## Freshness

AI operations that use selected-ticket source, such as suggested reply
generation or reviewed action preparation, must reload selected-ticket detail
server-side from the provider before prompt construction. They must not use
stale client state, stale route-loaded state, or stale persistent cache as
source context.

Proofread and rephrase are draft-only operations. They use the user's current
composer draft plus workspace-scoped My Style. Rephrase also uses the selected
workspace rephrase style prompt or a permitted personal override. They do not
require a provider read because they do not include selected-ticket source
context.

If a provider read fails, the AI operation is unavailable. The UI may preserve
the user's local draft text and show a retry path, but it must not generate from
stale source as a fallback.

The implemented summary slice has its own cache-only route hydration rule. That
summary-specific behavior must not be copied to drafting, reply, or reviewed
action operations without a new contract.

## Review And Approval

AI output is advisory until the user takes an explicit action:

- proofread/rephrase output must be accepted or applied by the user before it
  replaces draft text;
- suggested reply output must remain editable draft text until the user submits
  it through the existing customer reply path;
- reviewed action preparation must show the proposed structured changes before
  the user approves the existing provider-neutral update path;
- customer-visible communication and provider metadata writes must never run
  automatically after generation.

The UI must make failure and uncertainty recoverable. If an AI operation fails,
the original draft or current ticket state remains intact. If the provider write
later fails after user approval, the normal provider mutation failure handling
applies.

Unsubmitted inline composer text must be recoverable across page refreshes and
short browser interruptions. Local browser draft recovery may keep the draft
body and a small per-composer suggestion history until the user closes the
composer, discards changes, submits through Update, closes the ticket tab, or
the local retention window expires.

## Failure States

Future AI operations should reuse the existing provider-neutral unavailable
categories where possible:

- AI disabled for the workspace;
- missing workspace AI configuration;
- missing user AI configuration;
- invalid saved configuration;
- AI provider authentication failure;
- AI provider rate limit;
- temporary AI provider failure;
- selected-ticket source unavailable;
- stale or unverified source when a fresh provider read is required.

Errors must not expose prompts, generated text, provider response bodies,
provider request bodies, credentials, raw ticket content, model names, customer
email addresses, or provider-local identifiers.

## Logging And Telemetry

Telemetry may record metadata such as operation, phase, provider protocol
family, duration, status, unavailable reason, retryability, and cache event
where a cache exists.

Telemetry and logs must not include prompts, My Style text, draft text,
generated text, customer content, provider payloads, provider request bodies,
provider response bodies, credentials, model names, ticket IDs, article IDs,
recipient addresses, or raw provider-local identifiers.
