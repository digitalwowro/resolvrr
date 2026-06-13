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
- whether personal user overrides are allowed.

Prompt keys are product contracts. They should be short, stable, and tied to an
operation, not to a model, vendor, or helpdesk provider. Changing a prompt key
means creating a new prompt identity rather than renaming stored user content.

Prompt versions identify the built-in prompt contract. Version changes are
required when the built-in default, expected output, source requirements, or
operation semantics change enough that generated-output caches should no longer
be reused.

## Prompt Center Rules

Prompt Center is scoped to the active workspace. Admins manage workspace prompt
defaults and the workspace option that allows personal overrides where the
registry permits them. Non-admin users may see personal prompt controls only
when at least one registered prompt is user-overridable and workspace personal
overrides are enabled.

The selected-ticket summary prompt is the current admin-managed example. It is
admin-editable and never user-overridable so summaries remain consistent across
users in the same workspace.

Disabling personal overrides preserves saved user prompt rows but makes them
inactive. Effective prompt resolution must ignore user rows while the workspace
override option is off, even if rows still exist in storage.

## Storage And Privacy

Workspace prompt defaults and user prompt overrides are encrypted at rest with
the application encryption key. Prompt bodies must not be logged, included in
telemetry, exposed in client state outside authorized settings views, or copied
into provider writes.

Prompt Center edits may invalidate generated-output caches when the prompt can
affect the output. Cache identity must include at least the prompt version and a
fingerprint of the effective prompt text, not the raw prompt body in logs or
telemetry.

## Future Prompt Operations

Proofread, rephrase, suggested reply, and reviewed-action prompts must be
registered before implementation. Each operation must state whether My Style
applies, whether user prompt overrides are allowed, which selected-ticket source
data is used, and whether generated output is cached.
