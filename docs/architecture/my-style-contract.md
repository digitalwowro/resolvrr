# My Style Contract

My Style is personal, workspace-scoped writing guidance for AI drafting
operations. It helps the AI Assistant adapt generated text to the user's role
and writing preferences for the active helpdesk/workspace. It is not a
workspace prompt default, not ticket summary context, and not an admin policy
surface.

## Data Shape

My Style is structured guidance with these fields:

- Role: how the user wants to be represented in support communication.
- Audience: the typical audience or customer relationship the user writes for.
- Tone: preferred voice, such as concise, warm, formal, or direct.
- Writing preferences: positive guidance about phrasing, structure, length, or
  style.
- Constraints: things the assistant should avoid, such as promises, legal
  claims, excessive apology, or unsupported commitments.

The product may present these as separate fields or guided controls, but the
stored contract remains structured. A later implementation may add a limited
freeform note only if it remains part of the user's private style profile and
follows the same privacy rules.

## Ownership And Privacy

My Style belongs only to the user who created it in a specific workspace. It
must be encrypted at rest and keyed by `user + workspace`. Admins can configure
workspace AI policy, workspace prompt defaults, safety/guardrail instructions,
and workspace rephrase styles, but they cannot view or manage another user's My
Style content.

My Style text must not be logged, included in telemetry, exposed to other users,
or written to the helpdesk provider. If the app later adds an admin reset
workflow, it must clear the stored style without revealing the content.

The current implementation stores My Style server-side as one encrypted
structured payload per user per workspace. Loading My Style requires the
current authenticated user and active workspace. Saving and resetting also
require the workspace membership permission that allows My Style editing. Empty
fields are allowed; invalid oversized fields are rejected without changing the
stored style.

## Where My Style Applies

My Style applies only to user-writing operations whose contracts explicitly
include personal style:

- proofread and rephrase actions for user-written internal-note and customer
  reply drafts;
- suggested customer reply drafts;
- future drafting operations approved for personal writing guidance.

My Style does not apply to selected-ticket summaries by default. Summaries need
workspace consistency, source fidelity, and a shared voice independent of the
individual user's writing preferences. Applying My Style to summaries would
require a separate product decision and cache-identity update.

## Prompt Composition

When an operation uses My Style, prompt construction must combine:

- the registered operation prompt;
- the selected workspace rephrase style prompt or permitted personal style
  override for rephrase operations;
- the user's workspace-scoped My Style fields;
- fresh selected-ticket source context where required by the operation.

Proofread and rephrase currently use My Style with the user's current composer
draft only. They do not include selected-ticket thread content. Suggested reply
generation and any later source-aware drafting operation must include fresh
selected-ticket source context under the source/review contract.

My Style identity must be included in any durable generated-output cache
fingerprint for operations that cache generated drafts. The cache key may use a
fingerprint; raw style text must not appear in logs or telemetry.

## Reset Behavior

Users with the workspace edit permission must be able to reset their own My
Style for that workspace. Resetting removes the personal style guidance from
future generation in that workspace, but it must not alter workspace prompt
defaults, workspace rephrase styles, saved AI provider settings, ticket drafts,
other workspaces, or existing provider data.
