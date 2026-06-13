# My Style Contract

My Style is personal writing guidance for AI drafting operations. It helps the
AI Assistant adapt generated text to the user's role and writing preferences.
It is not a workspace prompt default, not ticket summary context, and not an
admin policy surface.

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

My Style belongs only to the user who created it. It must be encrypted at rest.
Admins can configure workspace AI policy and workspace prompt defaults, but
they cannot view or manage another user's My Style content.

My Style text must not be logged, included in telemetry, exposed to other users,
or written to the helpdesk provider. If the app later adds an admin reset
workflow, it must clear the stored style without revealing the content.

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
- the effective workspace or personal prompt override, if allowed;
- the user's My Style fields;
- fresh selected-ticket source context where required by the operation.

My Style identity must be included in any durable generated-output cache
fingerprint for operations that cache generated drafts. The cache key may use a
fingerprint; raw style text must not appear in logs or telemetry.

## Reset Behavior

Users must be able to reset their own My Style. Resetting removes the personal
style guidance from future generation, but it must not alter workspace prompt
defaults, saved AI provider settings, ticket drafts, or existing provider data.
