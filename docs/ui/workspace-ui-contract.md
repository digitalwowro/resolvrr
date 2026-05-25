# Workspace UI Contract

The workspace is the main daily surface for support agents. It should be dense,
operational, calm, and keyboard-accessible.

## Regions

- Header: compact product identity, global search, and avatar/profile trigger.
- Controls and tabs: ticket actions, saved view selector, column visibility,
  tab layout segmented control, and open-ticket tabs.
- Work area: ticket table first, with selected-ticket detail/thread rendered
  read-only when the active provider supports ticket reads.
- Initial table columns: select, `#`, `Title`, `Customer`, `Owner`, `State`,
  `Priority`, `Pending till`, and `Updated at`.

## Workspace Selection

The UI may call connected helpdesk instances workspaces. Workspace selection
lives in the avatar/profile menu. Code, database, and domain docs should use
explicit terms such as helpdesk connection.

## Ticket Tabs

Ticket tabs are navigation for open tickets. One ticket is active at a time. Do
not add single, split, or compare mode selectors unless that workflow is approved
later.

Horizontal ticket tabs sit directly above the table. Vertical ticket tabs use a
fixed left rail below the header while toolbar controls remain with the table
side. The vertical rail and ticket table scroll independently.

The tab layout control is a two-button segmented control, not a dropdown. It is
placed after column visibility and remains enabled in both List and selected
ticket panes. List-only controls such as row selection, refresh, saved view,
grouping, and column visibility remain visible but disabled while a selected
ticket pane is active.

## URL And Sharing

`/workspace?ticket=ID` is the direct-link and refresh contract for a selected
ticket. Initial requests with a ticket query are server-loadable. Post-hydration
workspace interactions keep navigation local: row opens, already-open tab
activation, List activation, post-update return-to-list behavior, and close-tab
fallbacks update the address bar with `window.history.replaceState()` instead
of App Router navigation.

The browser URL is kept aligned with the active ticket or List view. The ticket
detail header also exposes an icon-only copy-link control that writes the
current ticket's direct `/workspace?ticket=ID` URL to the clipboard.

## Ticket Detail

Selected ticket detail keeps the approved dense layout. Thread articles render
provider-sanitized rich HTML, use the shared global link color, and keep
reply/reply-all/composer controls out of production. Article metadata prefers
display names over email addresses, exposes email as secondary metadata when
available, and only shows the expand/collapse affordance when recipient details
exist.

The metadata sidebar remains read-only except for state and priority when the
active provider advertises the matching mutation capability. Editable state,
priority, and provider-required pending date/time controls use local staged
draft state: changing a value does not call the provider until the agent clicks
`Update`. Changed controls are visually marked, `Discard changes` resets only
unsaved UI edits to the loaded ticket values, and successful saves refresh the
workspace after one checked mutation. The action row includes a persisted local
browser post-Update navigation preference: keep the ticket open, return to list,
or return to list when the final canonical state is closed. Provider-supplied
hidden state options are omitted from the state dropdown. If a provider lacks
the capability, the field renders as ordinary read-only metadata.

## AI Status

AI features are deferred. The first workspace UI should omit AI status. If a
future interim indicator is added before AI features are approved, it must only
communicate unavailable or not configured state.

## Production Data Boundary

The real `/workspace` route must not mix synthetic tickets with provider-backed
tickets. Without an active helpdesk connection, it renders a disconnected state
with a path to connection management.

Production workspace components live under `src/features/workspace/components`
and must not import provider services, repositories, server actions, or provider
plugin internals.
