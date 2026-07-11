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
their own workspace key. AI keys are stored server-side and encrypted. The same
section lets admins decide whether non-admin workspace users may edit My Style
and whether they may customize rephrase prompts for their own drafts.

Prompt Center is available when workspace AI is enabled. Admins can manage
workspace prompt defaults for registered prompt operations and workspace
rephrase styles such as Professional, Friendly, Empathetic, and Concise. These
styles are the options shown in the inline editor.

My Style is available from `Settings -> My Style` under Workspace Settings when
AI is enabled for the active workspace. It lets each user store private,
workspace-specific writing guidance for draft-focused AI operations. It is
personal to the user within the active workspace, encrypted, and not visible to
admins. It is structured around role, audience, tone, writing preferences, and
constraints. Workspace membership controls whether a user can edit My Style in
that workspace.

Workspace membership can also allow a user to override rephrase style prompts
for their own drafts. The workspace-level AI Settings toggles update those
permissions for non-admin users. A personal rephrase style override replaces
that style's workspace prompt only for the owning user in the active workspace.
Admins can view and edit workspace base prompts, safety/guardrail instructions,
and workspace rephrase styles, but they cannot view another user's My Style or
personal rephrase style override text.

Admins can also manage per-user workspace access from `Settings -> Users`,
including workspace role, My Style edit permission, and personal rephrase prompt
customization permission.

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

Admins control workspace AI availability, provider settings, workspace base
prompts, safety/guardrail instructions, and workspace rephrase styles. Workspace
membership permissions control whether a user may edit My Style and personal
rephrase style overrides in that workspace. AI Settings exposes workspace-level
defaults for non-admin users. A rephrase style's Enabled state controls whether
that style is available in the editor; it does not grant personal prompt
customization. Admins cannot view another user's My Style content.

There is no app-wide AI provider key in v1. AI provider configuration is scoped
to the active workspace, with optional per-user keys when the workspace requires
user-provided AI.
