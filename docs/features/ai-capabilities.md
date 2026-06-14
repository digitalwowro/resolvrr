# AI Capabilities

The AI Assistant is a core Resolvrr v1 capability for support agents. It helps
agents understand selected tickets, improve draft text, prepare reply drafts,
and review proposed ticket actions. It does not submit communication or update
the helpdesk provider by itself.

## Current Capabilities

Selected-ticket summaries are available when AI is configured for the active
workspace. A summary is generated only from an explicit user action. Refreshing
a page may show an existing cached summary, but route loading does not generate
new AI output.

Admins configure workspace AI from `Settings -> AI Settings`. A workspace can
disable AI, use an admin-managed workspace key, or require each user to provide
their own workspace key. AI keys are stored server-side and encrypted.

Prompt Center is available when workspace AI is enabled. Admins can manage
workspace prompt defaults for registered prompt operations. Personal prompt
overrides may be enabled only for operations the registry marks as
user-overridable. The selected-ticket summary prompt is not user-overridable.

My Style is available from `Settings -> My Profile`. It lets each user store
private writing guidance for draft-focused AI operations. It is personal to the
user, encrypted, and not visible to admins. It is structured around role,
audience, tone, writing preferences, and constraints.

Proofread and rephrase actions are available in inline internal-note and
customer-reply composers when AI is configured. They operate on text the user
has already typed. Generated text is shown as a suggestion and does not replace
the draft unless the user explicitly applies it.

Unsubmitted inline composer drafts are recovered locally in the browser. The
current draft body and a small suggestion history can survive a page refresh and
are cleared when the user closes the composer, discards changes, submits through
Update, closes the ticket tab, or the local retention window expires.

## Planned V1 Capabilities

Suggested customer reply drafts will create editable draft text from the fresh
selected-ticket context. The user must review and submit the reply through the
normal customer reply flow.

Reviewed action preparation will help users prepare structured ticket changes
for existing update paths. The user must approve the proposed changes before
Resolvrr writes to the helpdesk provider.

## Source And Review Rules

AI features that use selected-ticket source must use a fresh server-side
provider read of the selected ticket before prompt construction. Proofread and
rephrase are draft-only and use the current composer text instead. Linked
tickets, saved views, knowledge base content, customer-wide history,
workspace-wide search results, and arbitrary provider records are outside the
v1 AI context.

AI output is advisory. It can be accepted, edited, ignored, or discarded.
Customer-visible communication still happens only after the user submits through
the selected helpdesk provider.

## Privacy

Resolvrr must not log prompts, generated summaries, generated draft text, My
Style text, provider payloads, credentials, model names, raw customer content,
or provider-local identifiers. AI telemetry is limited to operational metadata
such as operation, phase, provider protocol family, duration, status, reason,
retryability, and cache event where relevant.

## Admin Notes

Admins control workspace AI availability, provider settings, workspace prompt
defaults, and whether personal prompt overrides are allowed for eligible
prompts. Admins cannot view another user's My Style content.

There is no app-wide AI provider key in v1. AI provider configuration is scoped
to the active workspace, with optional per-user keys when the workspace requires
user-provided AI.
