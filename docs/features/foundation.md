# Foundation Feature Set

The foundation includes:

- Resolvrr users, email/password login, and server-side sessions.
- Per-user helpdesk connections.
- Encrypted provider credentials.
- Provider plugin registry.
- Saved view storage and per-user ordering/default preference shape.
- Minimal provider cache tables with explicit retention and invalidation rules.

The foundation does not include customer communication, workflow automation,
compare mode, team administration, public APIs, password reset, email delivery,
or AI features.

Current ticket workflows additionally treat provider-merged sources as hidden
terminal records: collections omit them, old links resolve to the survivor, and
unresolvable sources render a read-only tombstone. Resolvrr does not merge
tickets or deliver email; provider article writes remain the helpdesk's input to
its own delivery pipeline.
