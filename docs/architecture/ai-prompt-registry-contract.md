# AI Prompt Registry And Prompt Center Contract

Prompt Center is the workspace settings surface for registered AI prompt
operations. It does not create prompts dynamically. The application registry
defines which prompt operations exist before users can view or edit them.

## Registry Rules

Every registered prompt operation must define:

- a stable prompt key;
- a human label and short description;
- a built-in default prompt;
- a prompt version used for generated-output identity;
- a maximum prompt length;
- whether admins may edit the workspace default;
- whether the editable text is a complete prompt or supplemental guidance;
- editor labels and any read-only contract explanation shown in Prompt Center.

Prompt keys are product contracts. They should be short, stable, and tied to an
operation, not to a model, vendor, or helpdesk provider. Changing a prompt key
means creating a new prompt identity rather than renaming stored user content.

Prompt versions identify the built-in prompt contract. Version changes are
required when the built-in default, expected output, source requirements, or
operation semantics change enough that generated-output caches should no longer
be reused.

## Prompt Center Rules

Prompt Center is scoped to the active workspace. Admins manage registered
workspace AI configuration and the workspace rephrase style catalog. The
registry determines whether an operation exposes a complete prompt or
supplemental guidance so the UI does not infer semantics from a prompt key.
Non-admin users may see personal rephrase style override controls only when
their workspace membership allows them.

The current registered prompts are:

- `ticket-summary`: admin-editable supplemental guidance for summary emphasis
  and wording. The structured output, factuality, safety, and validation
  contract remains code-owned and read-only.
- `draft-proofread`: admin-editable. It applies to draft-only proofread
  operations and may use workspace-scoped My Style.
- `draft-rephrase`: admin-editable. It applies to draft-only rephrase
  operations, the selected workspace rephrase style, and workspace-scoped My
  Style.

## Rephrase Style Rules

Rephrase styles are workspace-scoped admin-managed records, not hard-coded UI
modes. The default seed styles are Professional, Friendly, Empathetic, and
Concise. Admins may create, edit, reorder, disable, or remove styles. Active
styles are the style choices shown in the inline composer.

Each style has a stable id, label, prompt body, sort order, enabled flag, and
optional built-in seed key. Built-in styles may be disabled and customized;
custom styles may be deleted. Removing or disabling a style must make it
unavailable for new rephrase actions.

Workspace membership may allow personal rephrase style overrides. A personal
override is scoped to `user + workspace + style`. It replaces that style's
workspace prompt for the owning user only. It does not create a new public style
option, does not affect other users, and does not let users change workspace
base prompts or safety/guardrail instructions.

## Storage And Privacy

Workspace prompt defaults, workspace rephrase style prompts, and personal
rephrase style overrides are encrypted at rest with the application encryption
key when they contain user/admin-authored prompt text. Prompt bodies must not be
logged, included in telemetry, exposed in client state outside authorized
settings views, or copied into provider writes.

Prompt Center edits may invalidate generated-output caches when the prompt can
affect the output. Ticket-summary caches are invalidated only when ticket-summary
guidance changes, not when unrelated draft prompts change. Cache identity must
include at least the prompt version and a fingerprint of the effective prompt
text, not the raw prompt body in logs or telemetry.

## Future Prompt Operations

Suggested reply and reviewed-action prompts must be registered before
implementation. Each operation must state whether My Style applies, whether user
rephrase style overrides apply, which selected-ticket source data is used, and
whether generated output is cached.
