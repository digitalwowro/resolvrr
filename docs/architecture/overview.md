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
- Read-only AI summary behavior is defined in
  `docs/architecture/read-only-ai-contract.md`; it is optional, explicit-action
  only, cannot write to helpdesk providers, and resolves encrypted AI provider
  settings plus workspace-scoped prompt defaults from the active workspace
  policy.

## First Release Shape

The first release targets a conservative multi-user foundation: email/password
Resolvrr users, SQL-backed sessions, per-user helpdesk connections, per-user
saved view preferences, and the workspace ticket workflow. Broader team
management, workflow automation, public APIs, assisted AI actions, and durable
assisted AI output beyond selected-ticket summaries are deferred. Read-only AI
summaries are limited to internal selected-ticket summaries configured from the
workspace-scoped Settings surface, including admin-managed prompt defaults.
