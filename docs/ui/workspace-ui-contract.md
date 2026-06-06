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

## Saved Views

Saved views are workspace-scoped ticket list queries managed from
`Avatar -> Settings -> Views`. The list toolbar saved-view control is only a
switcher: it must not expose create, edit, delete, or reorder controls. Changing
the selected view reloads the ticket list for that view and clears the current
bulk row selection. Open ticket tabs are unchanged by view selection.

New workspace users get one personal seeded view, `My work`, when the active
provider can resolve the current helpdesk user. `My work` means `Owner is
Myself` and `State is not Closed`, and it becomes the default when no valid
default exists. Deleting that seed dismisses seed key `my-work` for the user and
workspace, so it is not recreated. `All tickets` is not a saved view, is not
seeded, is not shown in Settings, and is not reorderable. It may only appear as
an internal unmanaged fallback when no saved view can be selected.

The Views settings section owns personal/shared visibility, title, appearance,
condition editing, default selection, ordering, and deletion. Agents can manage
personal views only. Admins can manage shared workspace views and their own
personal views. Conditions remain provider-neutral: fields are Owner, State,
Priority, and Group; operators are `is` and `is not`; values within one
condition are OR alternatives and separate conditions are ANDed. `All owners`
acts as no owner filter and is not persisted as a condition.

## Ticket Tabs

Ticket tabs are navigation for open tickets. One ticket is active at a time. Do
not add single, split, or compare mode selectors unless that workflow is approved
later.

Open ticket tabs are long-lived user UI state. The workspace stores them under
the active helpdesk connection in `UiPreference` as `workspace.openTabs`,
including open tabs, recent tabs, active pane (`list` or ticket ID), tab
orientation, and an update timestamp. This state is user-scoped and
connection-scoped so it survives browser restarts and syncs across devices.
The stored tab list is capped to the supported workspace limit and latest
server write wins.

Horizontal ticket tabs sit directly above the list toolbar or selected-ticket
pane. The List tab starts the tab strip; horizontal tabs stay constrained to the
available tab area and remain navigation-only. When title tabs no longer fit,
horizontal tabs fall back to ID-only labels before using icon-only overflow
behavior. ID-only tabs should remain wide enough to show normal ticket numbers
and their close affordance. Vertical ticket tabs use a fixed left rail below the
header. The vertical rail and ticket table scroll independently.

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

When a direct link opens with saved workspace tabs, the linked ticket is merged
into the saved tab set, activated, and preserved with the user's existing open
tabs. When no ticket query is present, the saved active pane is restored; `list`
is a first-class persisted active state. If a saved active ticket is no longer
available in the saved open-tab set, the workspace falls back to List.

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
Reply and Comment open inline rich-text editors only; they do not render their
own Cancel/Send footer. The editor toolbar is scoped to basic formatting:
bold, italic, underline, ordered list, unordered list, and link, with undo/redo
controls in the toolbar chrome. Staged communication HTML is part of the
selected-ticket draft and is sent by the main workspace `Update` action
alongside metadata.
After a successful communication update, the inline editor closes and the
thread scrolls to the refreshed newest article.
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
entry that opens a focused modal for staging one ticket link. The modal keeps
provider writes staged until the workspace `Update` action, shows no arbitrary
provider results for an empty search, and searches provider-neutral link targets
only when the active provider advertises `lookup:link-targets`. Search results
show ticket number, title, customer, state, and priority when available. If
search is unavailable or returns no matches for an explicit query, the modal
keeps the manual related-ticket ID fallback. When the selected-ticket detail
has a provider-neutral customer external ID, the modal may show a `From this
customer` section populated by the same provider-neutral link-target lookup
using that customer external ID. The modal may also show a `Recently viewed`
section derived only from tickets opened in the current browser session; it
does not perform provider reads. Recently viewed candidates exclude the active
ticket and the currently selected or manually staged target.
The default relation is Normal/Related; Parent and Child are selectable only
when the provider advertises `ticket:update-link-relations`, otherwise those
options remain visibly unavailable. Subscription controls update the current user's
following state. Changed controls and staged communication body content are visually
treated as one selected-ticket draft; `Discard changes`
resets the selected-ticket draft to the loaded ticket values, and successful
saves refresh the workspace after one checked mutation. The action row includes
a persisted local browser post-Update navigation preference: keep the ticket
open, return to list, or return to list when the final canonical state is
closed. Provider-supplied hidden state options are omitted from the state
dropdown. If a provider lacks the capability, the field renders as ordinary
read-only metadata; owner and group editing also require available lookup
options for the matching field.

## AI Status

Selected-ticket AI summaries are read-only and optional. They appear in the
selected-ticket header area and run only from an explicit agent `Generate`
action. Rendering a ticket, loading a route, refreshing a ticket, switching
tabs, or editing staged metadata must not trigger an AI request.

AI configuration lives in `Avatar -> Settings -> AI Settings` for the active
workspace. Admins see workspace policy and default provider settings. Users see
status only when the workspace uses an admin-managed key, and see their own
provider settings form only when the workspace requires user-provided keys.
Admins also see their own provider settings form when the active workspace
requires user-provided keys. Provider settings use approved dropdown primitives
for workspace AI policy and provider protocol. Model IDs and base URLs use
plain text inputs so compatible gateways, aliases, and future models can be
entered exactly. Model inputs link to OpenAI and Anthropic model reference
pages; base URL inputs provide default-fill actions for the first-party OpenAI
and Anthropic API URLs while preserving custom entry. Switching workspace is how
users configure a different workspace. When a workspace is saved in
user-provided-key mode, admins see only their personal key save action until the
workspace policy changes again.

The summary panel must report disabled, missing workspace setup, missing user
setup, unavailable, and rate-limited states without exposing raw provider
responses. A generated summary is advisory text only: it must not update ticket
metadata, staged communication, saved views, open tabs, or provider state.
Customer-visible communication still requires explicit user review and the
selected helpdesk provider write path.

## Production Data Boundary

The real `/workspace` route must not mix synthetic tickets with provider-backed
tickets. Without an active helpdesk connection, it renders a disconnected state
with a path to connection management.

Production workspace components live under `src/features/workspace/components`
and must not import provider services, repositories, server actions, or provider
plugin internals.
