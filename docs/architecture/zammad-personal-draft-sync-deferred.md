# Deferred Zammad Personal Draft Synchronization

## Status

Deferred and disabled. Resolvrr composer drafts are local-only and are never
read from or written to Zammad. Automatic ticket taskbar synchronization has
also been removed. The separate `Sync tabs` control performs a read-only,
best-effort import of desktop ticket tabs and does not include draft content.

## Why The Earlier Approach Was Removed

The initial implementation assumed that a user's REST taskbar ticket record
contained a complete, current article draft. Synthetic tests validated that
assumed shape, but a read-only live characterization against Zammad 6.5.4
disproved it.

For the characterized ticket, the authenticated user's taskbar record contained
only the ticket task and an article form identifier. It did not contain the
typed body, To, Cc, attachments, or any reliable change marker after the user
edited the Zammad composer and waited for autosave. Resolvrr therefore had no
authoritative draft to import. The reverse direction was also not proven to
populate Zammad's visible editor.

Continuing to advertise synchronization would risk false success labels, lost
or overwritten work, and accidental coupling to an undocumented payload that
the live instance did not expose.

## Contained Product Behavior

- Drafts survive Resolvrr ticket-tab switches through a workspace-lifetime
  memory controller.
- Draft recovery is stored in IndexedDB and scoped by Resolvrr user, workspace,
  personal helpdesk connection, provider identity version, and ticket.
- Closing a ticket with a draft requires an explicit Keep or Discard choice.
- Healthy local recovery writes stay visually silent; storage failures remain
  visible and must never be described as synchronized with Zammad.
- There are no provider draft reads, writes, polling timers, conflict imports,
  or taskbar-draft capability claims.
- Zammad shared drafts are not a fallback because their ownership and
  collaboration semantics do not match a private per-user composer draft.

## Required Future Characterization

Use a dedicated test user and ticket. Do not begin production implementation
until all steps below are evidenced:

1. Capture Zammad editor traffic while typing, changing recipients, adding and
   removing attachments, switching tickets, closing the browser, and reopening
   the ticket.
2. Identify whether persistence uses REST, GraphQL, a websocket/session
   channel, browser storage, or a combination.
3. Prove that the captured state belongs only to the authenticated Zammad user
   and cannot expose another agent's unsent work.
4. Prove a read contract for body, To, Cc, source article, reply intent,
   attachments, signatures, versioning, and clear state.
5. Prove a write contract by making a Resolvrr-originated test draft appear in
   the actual Zammad editor after reload.
6. Characterize concurrent edits, stale versions, cleared drafts, multiple
   browser sessions, and network failure.
7. Pin the supported Zammad version range and define a compatibility probe that
   fails closed.

An authorized browser-network capture or narrowly scoped Playwright
characterization is appropriate only when this work is explicitly resumed.

## Decision Gate

Implementation may resume only if Zammad exposes a stable, user-scoped,
server-visible transport that supports safe compare-and-set or equivalent
conflict detection.

If the state is browser-local or requires an unstable authenticated session
channel, choose one of these outcomes explicitly:

- keep Resolvrr drafts local-only;
- build and maintain a version-pinned Zammad extension that exposes a supported
  personal-draft API; or
- abandon cross-application draft synchronization.

Do not infer recipient fields, silently overwrite either editor, retry an
uncertain write, or fall back to shared drafts.

## Acceptance Criteria For A Future Slice

- Zammad to Resolvrr and Resolvrr to Zammad are both demonstrated against the
  visible editor, not only mocked payloads.
- Drafts remain isolated by the signed-in user's personal connection.
- Concurrent changes produce a user-visible conflict and preserve both
  versions.
- Attachments and signatures either round-trip safely or fail closed without
  overwriting the provider draft.
- Provider incompatibility disables synchronization without affecting tickets
  or local draft recovery.
- Tests include captured, redacted contract fixtures plus a repeatable
  controlled-instance characterization procedure.
