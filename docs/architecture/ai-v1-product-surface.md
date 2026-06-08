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

AI controls live where the work happens. Summaries stay in the selected-ticket
summary panel. Drafting actions belong in the inline composer workflow. Reviewed
action preparation belongs near the ticket update surface that already owns the
affected provider-neutral update.

## Context Boundary

V1 AI Assistant operations may use only the selected ticket's provider-neutral
metadata and sanitized article/thread text. Linked tickets, saved views,
customer-wide history, knowledge base content, workspace-wide search results,
and arbitrary provider records are not v1 AI context.

AI runtime code must stay outside helpdesk provider plugins. Helpdesk providers
continue to own only provider reads and writes. Core, workspace UI, and ticket
features must not branch on helpdesk provider names for AI behavior.

## Review And Submission

AI output is never a provider write by itself. Generated summaries are advisory.
Drafts and suggestions remain editable user-reviewed content. Reviewed agentic
actions may prepare structured changes, but the user must approve them before
the existing provider-neutral update path runs.

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
