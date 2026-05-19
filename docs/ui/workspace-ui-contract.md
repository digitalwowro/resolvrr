# Workspace UI Contract

The workspace is the main daily surface for support agents. It should be dense,
operational, calm, and keyboard-accessible.

## Regions

- Header: compact product identity, global search, and avatar/profile trigger.
- Controls and tabs: ticket actions, saved view selector, tab presentation
  selector, column visibility, and open-ticket tabs.
- Work area: ticket table first, with selected-ticket detail added when that
  workflow is implemented.

## Workspace Selection

The UI may call connected helpdesk instances workspaces. Workspace selection
lives in the avatar/profile menu. Code, database, and domain docs should use
explicit terms such as helpdesk connection.

## Ticket Tabs

Ticket tabs are navigation for open tickets. One ticket is active at a time. Do
not add single, split, or compare mode selectors unless that workflow is approved
later.

## AI Status

AI features are deferred. The first workspace UI should omit AI status. If a
future interim indicator is added before AI features are approved, it must only
communicate unavailable or not configured state.
