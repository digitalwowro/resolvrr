# Workspace UI Contract

The workspace is the main daily surface for support agents. It should be dense,
operational, calm, and keyboard-accessible.

## Regions

- Header: compact product identity, global search, tab layout segmented
  control, and avatar/profile trigger.
- Tabs: open-ticket navigation only.
- List toolbar: List-only controls directly above the ticket table: Select all,
  Refresh, a disabled Bulk actions placeholder, saved view selector, grouping,
  and column visibility.
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

Horizontal ticket tabs sit directly above the list toolbar or selected-ticket
pane. The List tab starts the tab strip; horizontal tabs stay constrained to the
available tab area and remain navigation-only. Vertical ticket tabs use a fixed
left rail below the header. The vertical rail and ticket table scroll
independently.

The tab layout control is a two-button segmented control, not a dropdown. It is
placed in the merged header and remains enabled in both List and selected ticket
panes. Saved view, grouping, column visibility, Refresh, Select all, and Bulk
actions are list-scoped and render only when the List pane is active. Row
selection remains table-scoped and is only shown with the ticket table.

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

Selected ticket detail keeps the approved dense layout. The ticket title,
summary metadata, and article thread live inside one bordered conversation
section, and that section owns its own vertical scrollbar. The metadata sidebar
and bottom update bar remain outside that conversation scroller. Thread
articles render provider-sanitized rich HTML and use the shared global link color. Public
articles expose provider-neutral Reply when customer replies are supported. All
articles expose provider-neutral Comment when internal notes are supported.
Reply all is shown disabled until a provider-neutral recipient contract exists.
Article metadata prefers display names over email addresses, exposes email as
secondary metadata when available, and only shows the expand/collapse affordance
when recipient details exist.

The metadata sidebar remains read-only except for state, priority, owner,
group, tags, links, and subscription when the active provider advertises the
matching mutation capability. It starts at the top of the selected-ticket pane,
aligned beside the ticket detail header and thread. Editable metadata controls
and provider-required pending date/time controls live in the local
selected-ticket draft: changing a value does not call the provider until the
agent clicks `Update`. Each `Update` click submits one provider-neutral
selected-ticket payload. Tags render as a chip combobox with removable chips,
a visible inline add-tag entry, and provider-neutral suggestions when the active
provider can supply them. The tag suggestion menu stays hidden on focus and only
shows suggestions that contain the typed query after the agent enters text;
unsupported or unavailable suggestions do not disable freeform tag editing.
Link controls render linked-ticket rows with remove controls and an `Add link`
entry that opens a focused modal for staging one normal/related ticket link by
ID. The modal does not search provider tickets, does not fetch recent tickets,
and does not expose parent/child relation choices until the mutation contract can
persist those choices. Old link modal parity requires provider-neutral ticket
search plus relation-kind mutation support. Subscription controls update the
current user's following state. Notes and replies remain read-only or absent
until their own provider-neutral write contracts are added. Changed controls are
visually marked, `Discard changes`
resets the selected-ticket draft to the loaded ticket values, and successful
saves refresh the workspace after one checked mutation. The action row includes
a persisted local browser post-Update navigation preference: keep the ticket
open, return to list, or return to list when the final canonical state is
closed. Provider-supplied hidden state options are omitted from the state
dropdown. If a provider lacks the capability, the field renders as ordinary
read-only metadata; owner and group editing also require available lookup
options for the matching field.

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
