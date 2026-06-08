# Resolvrr Architecture

Resolvrr is a provider-neutral helpdesk workspace. The core app owns users,
sessions, settings, helpdesk connections, saved views, provider cache policy,
and the support-agent workflow. Helpdesk systems remain the source of truth for
tickets and conversations.

## Boundaries

- Core domain code uses provider-neutral names such as ticket, helpdesk
  connection, provider plugin, saved view, owner, group, state, priority, tag,
  link, and subscription.
- The UI may call a connected helpdesk instance a workspace, but persistence and
  code use explicit names such as `HelpdeskConnection`.
- Provider-specific API clients, raw values, query syntax, credentials,
  pagination, rate limits, and error formats stay inside provider plugins.
- Core use cases call provider contracts only.
- Customer communication must go through the selected helpdesk provider.
- Cache and freshness behavior is defined in
  `docs/architecture/cache-and-privacy-contract.md`; current durable cache
  slices are limited to selected-ticket detail/thread snapshots and generated
  selected-ticket summaries.
- The AI Assistant v1 product surface is defined in
  `docs/architecture/ai-v1-product-surface.md`. Current implemented AI slices
  are selected-ticket summaries, workspace AI settings, Prompt Center, and
  generated-summary cache. Summary-specific behavior is defined in
  `docs/architecture/read-only-ai-contract.md`.

## First Release Shape

The first release targets a multi-user support workspace with AI Assistant as a
core product capability. The v1 AI surface includes selected-ticket summaries,
Prompt Center, My Style, proofread/rephrase, suggested reply drafts, and
reviewed action preparation for existing provider-neutral update paths. Broader
team management, workflow automation, scheduled/background jobs, public APIs,
and autonomous provider writes are deferred.
