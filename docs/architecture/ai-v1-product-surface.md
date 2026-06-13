# AI V1 Product Surface

The AI Assistant is a core Resolvrr v1 product capability. It helps support
agents understand selected tickets, improve their own draft text, prepare reply
drafts, and review proposed ticket actions. It does not replace the agent as
the actor who submits communication or provider updates.

## Terms

- AI Assistant: the user-facing umbrella term for Resolvrr AI capabilities.
- Draft: editable generated or user-written text that has not been submitted to
  the helpdesk provider.
- Suggestion: advisory AI output that the user may accept, edit, ignore, or
  discard.
- Agentic action: AI-prepared action review for an existing provider-neutral
  update path. It is not autonomous execution.
- Automation: background, scheduled, or rule-driven workflow execution. It is
  outside the v1 AI Assistant surface.
- Send: the existing explicit user submit path for customer-visible
  communication.

## V1 Surface

The v1 AI Assistant surface includes:

- selected-ticket summaries;
- Prompt Center for workspace prompt defaults and allowed personal overrides;
- My Style for user-specific writing guidance;
- proofread and rephrase actions for user-written internal-note and customer
  reply drafts;
- suggested customer reply drafts;
- reviewed action preparation for existing provider-neutral update paths:
  metadata updates, internal notes, and customer replies.

AI controls live where the work happens:

- Summaries stay in the selected-ticket summary panel.
- Proofread and rephrase actions belong in the inline composer workflow and
  operate only on text the user has already drafted.
- Suggested reply drafts belong in the selected-ticket reply workflow and remain
  editable draft text until the user submits the reply through the normal
  provider communication path.
- Prompt Center lives in workspace settings because prompt defaults and override
  policy are workspace governance.
- My Style lives in profile settings because it is personal writing guidance.
- Reviewed action preparation belongs near the ticket update surface that
  already owns the affected provider-neutral update.

Implemented and future AI operations must keep their contracts separate. The
selected-ticket summary contract must not quietly become the reply-draft,
proofread, rephrase, My Style, or reviewed-action contract.

## Capability Contracts

Selected-ticket summaries explain the current ticket. They use provider-neutral
ticket metadata and sanitized thread text. Summary output is advisory, may be
cached as encrypted generated output, and never changes the selected-ticket
draft or writes to the helpdesk provider.

Prompt Center lets admins manage workspace prompt defaults for registered AI
operations. The registry decides which prompts exist, which are admin-editable,
which may be user-overridable, their built-in defaults, and their version
identity. The current `ticket-summary` prompt is admin-editable and never
user-overridable.

My Style is user-specific writing guidance for drafting operations. It is not a
workspace prompt default, not an admin-managed policy text, and not summary
context. My Style applies only to operations whose contract explicitly includes
personal writing guidance.

Proofread and rephrase actions improve text the user has already written in an
internal-note or customer-reply draft. They do not create provider writes, do
not send communication, and must leave the original text recoverable until the
user explicitly accepts or applies generated text.

Suggested reply drafts create editable customer-reply draft text from selected
ticket context. They do not submit a reply. The user must review, edit if
needed, and submit through the existing explicit customer communication path.

Reviewed action preparation may prepare structured suggestions for existing
provider-neutral update paths. It may explain proposed changes and present a
reviewable preview, but it must not execute a provider write without explicit
user approval through the existing update or communication flow.

## Context Boundary

V1 AI Assistant operations may use only the selected ticket's provider-neutral
metadata and sanitized article/thread text. Linked tickets, saved views,
customer-wide history, knowledge base content, workspace-wide search results,
and arbitrary provider records are not v1 AI context.

Drafting and reply-generation operations must reload selected-ticket detail
server-side from the provider before prompt construction. They must not generate
from stale route state, stale client state, or stale persistent cache. Cache may
still support already-implemented summary display where that contract allows
cache-only hydration, but future drafting and reply generation require a fresh
provider read.

AI runtime code must stay outside helpdesk provider plugins. Helpdesk providers
continue to own only provider reads and writes. Core, workspace UI, and ticket
features must not branch on helpdesk provider names for AI behavior.

## Review And Submission

AI output is never a provider write by itself. Generated summaries are advisory.
Drafts and suggestions remain editable user-reviewed content. Reviewed agentic
actions may prepare structured changes, but the user must approve them before
the existing provider-neutral update path runs.

The user review step must show enough context for the user to understand what
will happen next:

- generated draft text remains visible and editable before submit;
- suggested replacement text must not silently overwrite user text;
- prepared metadata/action changes must be presented as structured pending
  changes before the existing Update action writes them;
- customer-visible communication uses the existing explicit Send/submit path;
- failed, unavailable, or uncertain AI states must not leave hidden provider
  mutations pending.

The AI Assistant must not:

- auto-send customer communication;
- run autonomous provider mutations;
- trigger background jobs or scheduled workflows;
- use non-selected-ticket context in v1;
- hide or bypass the existing user review and submit paths.

## Privacy And Logging

AI Assistant operations follow the existing AI privacy posture: prompts,
generated summaries, draft suggestions, generated replies, My Style text,
customer content, provider payloads, model names, credentials, and raw provider
identifiers must not be logged.

Telemetry may record metadata only, such as operation, phase, provider protocol
family, cache event, duration, status, unavailable reason, and retryability.
Every future AI Assistant feature must keep source context bounded and visible
enough for the user to review the generated output.

## Related Contracts

- `docs/architecture/read-only-ai-contract.md` covers the implemented
  selected-ticket summary slice.
- `docs/architecture/ai-prompt-registry-contract.md` covers prompt registry and
  Prompt Center rules.
- `docs/architecture/my-style-contract.md` covers personal style data.
- `docs/architecture/ai-source-review-contract.md` covers source freshness,
  review, failure, and logging requirements for future drafting/reply/action
  operations.
