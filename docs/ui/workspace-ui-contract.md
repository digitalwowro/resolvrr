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
  `Priority`, `Pending`, and `Updated`. List and detailed Search use the
  same grid: preferred track widths may shrink and truncate within the available
  pane, but must never expand the workspace or create page-level overflow. The
  preferred tracks are spacing `11` for selection, spacing `24` for ticket
  number, flexible remaining width for Title, spacing `34` for Customer and
  Owner, `36` for State, `30` for Priority, and `28` for both date columns.
- Ungrouped List and detailed Search initially show up to 100 tickets. Quick
  search remains limited to ten suggestions. State/priority grouping remains
  bounded to 25 tickets per bucket, with explicit per-bucket pagination.

## Time Display

Workspace time labels use compact relative wording so agents can scan recency and
upcoming deadlines consistently. Invalid or unavailable timestamps render as
`Unknown`.

Relative time labels use these thresholds:

- Under 60 seconds: `now`.
- Under 60 minutes: `5m ago` or `in 15m`.
- Under 24 hours: `2h ago` or `in 2h`.
- Beyond 24 hours: `yesterday`, `tomorrow`, `5d ago`, or `in 5d`.

Do not mix absolute date/time labels into ticket list, ticket detail, thread
metadata, AI summary source/status labels, or notification surfaces unless a
later feature explicitly adds a separate audit timestamp affordance.

## Workspace Selection

Workspace selection lives in the avatar/profile menu. A workspace is shared
Resolvrr configuration: provider type, canonical helpdesk URL, membership,
views, AI configuration, and UI preferences. Every member separately connects
their own helpdesk account to that workspace. Selecting a workspace without a
valid personal connection remains possible so the member can reach Settings,
but provider-backed functionality renders `Personal connection required`.

Settings shows the signed-in user `Connected as …` after provider validation.
Admins may see connection status for other members, but never their provider
identity, credential fields, validation controls, or an act-as affordance.
Adding a member never copies credentials. Changing the shared provider URL
requires explicit destructive confirmation and disconnects every member.
Workspace ownership transfer never transfers a connection or credential.

## Saved Views

Saved views are workspace-scoped ticket list queries managed from
`Avatar -> Settings -> Views`. The list toolbar saved-view control is only a
switcher: it must not expose create, edit, delete, or reorder controls. Changing
the selected view reloads the ticket list for that view and clears the current
bulk row selection. Open ticket tabs are unchanged by view selection.
The last successfully loaded selection is stored per user and workspace. Server
refreshes, ticket-detail navigation, and post-update return-to-list behavior
restore that selection; the configured default is only a fallback when the
stored view was deleted, became inaccessible, or is unsupported by the active
provider.

New workspace users get one personal seeded view, `My work`, when the active
provider can resolve the current helpdesk user. `My work` means `Owner is
Myself` and `State is not Closed`, and it becomes the default when no valid
default exists. Deleting that seed dismisses seed key `my-work` for the user and
workspace, so it is not recreated. `All tickets` is not a saved view, is not
seeded, is not shown in Settings, and is not reorderable. It may only appear as
an internal unmanaged fallback when no saved view can be selected.

Manual and silent list refreshes re-run the active saved-view query for every
page or independently expanded group page currently loaded by the agent. The
refreshed window replaces those rows atomically, so tickets that no longer match
the view—such as a ticket closed from `My work`—do not linger. A failed page
refresh leaves the prior loaded window intact.
When a server refresh follows a ticket update or close, it must not replace an
active provider-sorted list with the server page's default ordering. The client
retains the applied sort and immediately reconciles the refreshed page window
through the provider using that same sort.

Sorting always applies to the complete matching result, never only to the rows
currently visible. Provider-native scalar fields remain sorted upstream before
pagination. Relationship labels such as Owner and Customer must not be sorted
by opaque provider IDs: Resolvrr loads every matching page, shows progress,
sorts the complete set by its display labels, and then exposes it through the
normal incremental list window. Unassigned relationship values remain last in
both directions. A failed complete load leaves the prior list intact and says
that the requested sort was not applied.

## Global Ticket Search

Header search follows the provider-backed interaction, restoration,
accessibility, and privacy behavior in
`docs/architecture/ticket-search-contract.md`.

The Views settings section owns personal/shared visibility, title, appearance,
condition editing, default selection, ordering, and deletion. Agents can manage
personal views only. Admins can manage shared workspace views and their own
personal views. Conditions remain provider-neutral: fields are Owner, State,
Priority, and Group; operators are `is` and `is not`; values within one
condition are OR alternatives and separate conditions are ANDed. `All owners`
acts as no owner filter and is not persisted as a condition.

The server-rendered view definitions do not imply that provider lookups are
loaded. Opening Views performs one current personal-connection lookup refresh
so Group and assignable Owner condition values reflect the signed-in user's
helpdesk access. A positive Group condition narrows Owner values to agents with
full access to any selected group; a negative-only Group condition does not.
Existing incompatible owner chips remain visible while editing, but the editor
blocks Save until current provider access can be verified or the values are
corrected. `Myself` is subject to the same group-access validation and
`Unassigned` remains valid.

## Ticket Tabs

Ticket tabs are navigation for open tickets. One ticket is active at a time. Do
not add single, split, or compare mode selectors unless that workflow is approved
later.

Open ticket tabs are long-lived user UI state. The workspace stores them under
the active workspace in `UiPreference` as `workspace.openTabs`,
including open tabs, recent tabs, active pane (`list` or ticket ID), tab
orientation, and an update timestamp. This state is user-scoped and
workspace-scoped so it survives browser restarts and syncs across devices.
The stored tab list is capped to the supported workspace limit. Every save is
bound to the workspace that originated it, and an older asynchronous save
cannot overwrite a newer local tab action.
Persisted tabs without a valid selectable state key are removed individually;
legacy `Unknown` merged tabs do not invalidate otherwise valid preferences.

When the active provider supports ticket taskbar synchronization, Zammad's
ticket tasks are the initial source of truth for open tabs and ordering.
Resolvrr then sends every explicit local open, close, activation, and reorder
immediately. Failed writes keep the local action, show `Not synchronized` on
affected tabs, and retry during the 60-second/focus reconciliation. Once the
server confirms that an action is durably staged, the browser stops resending
that explicit action and polls the server outbox instead, so an old retry cannot
overwrite a newer action from another window. Only ticket tasks participate;
other provider taskbar item types are untouched.
When the affected tab is no longer visible, such as after a failed close,
Resolvrr shows one global pending-change notice instead of silently hiding the
retry state.
Opening a new local ticket stages independent durable open and active intents;
selecting an existing tab sends only the idempotent activation. This preserves
every newly opened tab while rapid selection keeps only the latest active
intent. The provider also creates a missing ticket task defensively before
activating it. Older asynchronous provider snapshots cannot replace a newer
local action. Closing the active tab also synchronizes
the selected successor, or List when no successor remains. Ordinary in-flight
commands do not show warning dots or banners. The existing workspace open-tab
cap still bounds hydration and rendering, but always retains a positively
identified active ticket and any local draft-protected conflict. Opening beyond
the cap synchronizes the resulting local eviction as a provider close. Repeated
focus events are coalesced, rapid selections send only the latest active intent,
and separate in-memory queues are bound to the full user, workspace, personal
connection, and identity-version scope. Old-scope responses cannot update the
current workspace. Polling and explicit synchronization stay disabled until
that complete personal scope is available; the client never submits an
unscoped taskbar request.
Opening a ticket from notifications preserves the notification-first local
position in the provider; pending reorder intent executes after pending
open/close work so it cannot be applied before the referenced task exists.
Notification reads remain available when one stale notification references a
ticket that was deleted or is no longer accessible. Only that item is omitted;
provider authentication, connectivity, and contract failures continue to show
the notification error state.

Provider absence closes a clean local tab unless a newer local open remains
pending. A tab with an unsaved communication draft stays open and displays a
conflict offering only `Close in Resolvrr`; accepting retains the browser draft
for later restoration. Draft presence is published synchronously before its
ordered IndexedDB write settles, so reconciliation cannot close the tab during
the brief save interval. This rule also overrides initial provider replacement.
A positively identified provider active ticket switches every visible Resolvrr
session on its next reconciliation. Missing, multiple, or indeterminate active
values never force Resolvrr to List. An active non-ticket Zammad task also makes
ticket selection indeterminate rather than allowing a stale ticket-active flag
to switch Resolvrr.

If a stale provider task points to a merged source ticket, Resolvrr resolves it
through the normal provider-neutral merge contract, ensures the surviving
ticket task exists and is active when required, and only then closes the source
task. The workspace renders and selects the surviving ticket without exposing a
nested or editable merged source.

Horizontal ticket tabs sit directly above the list toolbar or selected-ticket
pane. The List tab starts the tab strip; horizontal tabs stay constrained to the
available tab area and remain navigation-only. When title tabs no longer fit,
horizontal tabs fall back to ID-only labels before using icon-only overflow
behavior. ID-only tabs should remain wide enough to show normal ticket numbers
and their close affordance. Vertical ticket tabs use a fixed left rail below the
header. They use the same bottom status accent grammar as horizontal ticket
tabs: active tickets show a full-width bottom underline, while inactive tickets
show a short muted bottom dash. Vertical ticket tabs keep the ticket title on
the first line and place ticket number/customer plus compact priority metadata
on the second line. Priority is shown as a small icon with an accessible label,
not as a second status stripe. The vertical rail and ticket table scroll
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

When a direct link opens with saved workspace tabs, the linked ticket is merged
into the saved tab set, activated, and preserved with the user's existing open
tabs. When no ticket query is present, the saved active pane is restored; `list`
is a first-class persisted active state. If a saved active ticket is no longer
available in the saved open-tab set, the workspace falls back to List.

The browser URL is kept aligned with the active ticket or List view. The ticket
detail header also exposes an icon-only copy-link control that writes the
current ticket's direct `/workspace?ticket=ID` URL to the clipboard.

With ticket taskbar synchronization enabled, selecting List is a synchronized
active-pane action rather than a browser-only state. Resolvrr immediately keeps
List selected, clears active ticket tasks through the provider, and retries a
failed deactivation without allowing an older remote active ticket to bounce the
workspace back during mount, interval, or focus reconciliation.

An old URL or tab for a merged source resolves to the final surviving ticket
before editable detail is rendered. The source tab is replaced and deduplicated,
the URL is changed to the survivor, source open/recent entries are removed, and
a non-modal notice identifies the source and destination ticket numbers. If the
destination cannot be resolved or read, the workspace shows only a read-only
merged-ticket tombstone; it exposes no ticket content, provider identifier,
composer, metadata controls, AI actions, footer, or Update button.

## Ticket Detail

Selected ticket detail keeps the approved dense layout. The ticket title,
summary metadata, and article thread live inside one bordered conversation
section, and that section owns its own vertical scrollbar. The metadata sidebar
and bottom update bar remain outside that conversation scroller. Thread
articles render provider-sanitized rich HTML and use the shared global link color.
Each article owns a full-width bottom boundary and a thin, uninterrupted direction
rail: indigo for customer messages, dark slate for agent messages, amber for internal
comments, and muted slate for system or unknown items. The rail spans only its
article and intentionally has no timeline dots or nodes. Attachments, expanded
signatures, and quoted replies use lighter inset dividers so they remain subordinate
to the boundary between complete articles.
Email presentation tables retain their safe provider layout instead of receiving
blanket data-table borders, widths, or cell padding. Verified embedded raster
images render in place through authenticated same-origin URLs and retain safe
provider dimensions; remote images stay blocked. Wide layouts scroll within the article.
Public reply-capable articles expose provider-neutral Reply and, for email,
enabled or disabled Reply all. Internal/system/unsupported articles expose no reply action.
Article signature collapse is precision-first and language-neutral: explicit
provider-normalized boundaries, standard signature delimiters, and strongly isolated
compact contact blocks may collapse. Terminal rich-media contact tables require
multiple images, multiple image links, a displayed contact link, and phone-shaped
text before they qualify; this keeps ordinary embedded documents and galleries
visible. A strong image contact block may include a bounded, unstructured terminal
footer. Ambiguous text remains visible, and sign-off wording is never evidence.
Public email articles expose Forward independently of Reply eligibility.
Comment exists only in the ticket footer. Footer Reply and Reply all use the
newest reply-capable public article; an older article action explicitly overrides
that source. Every action scrolls to and focuses the single ticket-level composer
above the newest article, so the thread never implies nested replies.

Forward opens the same ticket-level composer with editable To/Cc and Subject.
Recipients start empty, the subject defaults exactly to the source subject, and
the agent can include or omit the reviewed conversation history and each
provider-classified visible source attachment. Inline body resources and
message alternatives never appear as attachment rows or choices. The collapsed
history preview is read-only; only the agent introduction is editable and
eligible for proofread/rephrase. No Bcc control is available. Forward-only
controls use the same full-width content inset as To/Cc and the editor, without
a separate section divider. Opening any
communication mode scrolls only the conversation region; it must never move the
application viewport or create space below the sticky ticket action bar.

Article attachment rows are keyboard-focusable download links when the current
user has an active personal helpdesk connection. Clicking a row downloads the
exact provider-classified visible file through Resolvrr's authenticated,
same-origin route; the UI never links directly to a provider URL. Filename,
content type, and byte size remain visible, while inline body resources and
message alternatives remain absent from the attachment list.

The reply/forward composer shows editable To and Cc chips and never Bcc. It validates
plain email additions, deduplicates across fields with To precedence, requires at
least one recipient, and warns without blocking when a provider-managed address
is manually added. Reply, Reply all, and Forward include reviewed public
conversation history by default when a provider history context is available.
An article-level action includes only the selected source and earlier public
messages; a sticky-footer action includes current public history through now.
The option and a collapsed, read-only newest-first preview live inside the
editor shell after the signature. The transcript contains public customer/agent messages,
omits internal/system content, removes already-quoted history and signatures,
preserves bounded inline images, and lists historical attachment names without
reattaching them. Switching mode, source, or intent with body text or recipient
edits requires confirmation. The editor toolbar is scoped to basic formatting:
bold, italic, underline, ordered list, unordered list, and link, with undo/redo
controls on the left. Proofread, Rephrase, and the non-functional AI Reply
placeholder align on the right at 14px. Rephrase opens the configured style
menu and selecting one style immediately prepares that rephrase request. A
non-empty editor selection scopes Proofread or Rephrase to that text; otherwise
the complete authored draft is used. While that selection is active, the
buttons read `Proofread selection` and `Rephrase selection`. Toolbar focus must preserve the captured
selection, Apply must replace only an unchanged captured range, and stale or
non-editable mention selections must fail closed without changing the draft.
Visually selected text must retain neighboring paragraph/list boundaries even
when the browser's internal selection includes an adjacent block separator.
Staged communication HTML is part of the selected-ticket draft and is sent by
the main workspace `Update` action alongside metadata.
Typing `@@` followed by a query opens a keyboard-accessible mention picker for
active helpdesk agents with read access to the staged ticket group. Selecting an
agent inserts a provider-neutral, non-editable mention token into the same
scoped browser draft. Suggestions must contain the normalized query in their
visible label, rank prefix matches first, and float from the live insertion
caret inside the editor rather than from the editor boundary. The provider
converts and validates that token only as part of the final article write;
there is no separate notification or subscription write. If the group or agent
access changed, Update fails closed, retains the communication draft, and
reports the invalid mention.
Reply and Forward show the read-only signature inside the editor's bordered
visual shell, directly after the editable body. An available signature is
collapsed by default behind a compact, keyboard-accessible disclosure and may be
expanded without becoming part of the editable DOM, AI rewrite range, or
persisted authored body. Loading, unavailable, and retry states occupy the same
read-only footer. Update remains disabled while that preview is unavailable or no
longer matches the draft's reviewed context. A staged Group change refreshes the
preview before submission. Workspace admins choose Zammad-managed,
Resolvrr-managed, or no signature in Settings > Signatures; existing workspaces
default to no signature. Resolvrr templates support a workspace default plus
group overrides, safe variables, and bounded managed images. Agents always see
the exact rendered signature—or the explicit absence of one—before Update.
After a successful communication update, the ticket-level editor closes and the
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
agent clicks `Update`. The pending selector includes one compact preset row for
Tomorrow, 1 week, 2 weeks, and 1 month. Presets preserve the staged time, keep
the selector open, and move the visible calendar to the selected local-calendar
date; calendar-month selection clamps safely at month end. Each `Update` click
submits one provider-neutral selected-ticket payload. Tags render as a chip combobox with removable chips,
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
treated as one selected-ticket draft. The footer groups Reply, Reply all,
Forward, and Comment on the left, with Discard changes, the post-Update navigation selector,
and Update on the right. `Discard changes`
resets the selected-ticket draft to the loaded ticket values, and successful
saves refresh the workspace after one checked mutation. The action row includes
a persisted local browser post-Update navigation preference: keep the ticket
open, return to list, or return to list when the final canonical state is
closed. Provider-supplied hidden state options are omitted from the state
dropdown. If a provider lacks the capability, the field renders as ordinary
read-only metadata; owner and group editing also require available lookup
options for the matching field. Owner options are scoped to the selected group
and require full ticket access. Changing Group clears a staged assigned owner,
loads the new eligible owner set, and requires an eligible selection before
Update. The provider freshly revalidates the final owner/group pair before any
ticket write.
`Merged` never appears as a state label, badge, row, group, count, filter,
saved-view value, link candidate, related-ticket entry, or notification.

## AI Assistant

The AI Assistant is a core v1 workspace capability. Its controls are embedded
where the work happens: selected-ticket summaries in the summary panel, future
proofread/rephrase and reply-draft actions inside inline composer workflows,
and future reviewed action preparation near the ticket update surface that owns
the affected provider-neutral update.

Selected-ticket AI summaries are the currently implemented read-only AI
Assistant slice. They appear in the selected-ticket header area and run only
from an explicit agent `Generate` action. Rendering a ticket, loading a route,
refreshing a ticket, switching tabs, or editing staged metadata must not
trigger an AI request.

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

AI Settings also exposes admin-only user AI permission controls for the active
workspace. `Allow users to manage My Style` controls whether non-admin workspace
users can edit their workspace-scoped My Style. `Allow users to customize
rephrase prompts` controls whether non-admin workspace users can create personal
rephrase style prompt overrides. These controls update workspace membership
permissions for non-admin users; they are separate from a rephrase style's
`Enabled` state, which only controls whether that style appears as an available
editor option.

The summary panel must report disabled, missing workspace setup, missing user
setup, unavailable, invalid structured output, and rate-limited states without
exposing raw provider responses. It renders only server-validated structured
summary content. Situation is required; empty Timeline and null Next Risk
sections remain absent rather than displaying invented placeholders. Available
summaries use one unified, lightly tinted operational-brief surface: a subtle indigo rail,
prominent Situation, compact chronological Timeline, and restrained amber Next
Risk footer. The structured hierarchy distinguishes generated synthesis from
ordinary ticket articles without introducing nested cards or unsupported
metrics. A generated summary is advisory text only: it must not update ticket
metadata, staged communication, saved views, open tabs, or provider state.
Customer-visible communication still requires explicit user review and the
selected helpdesk provider write path.

V1 proofread/rephrase, reply drafts, and reviewed action preparation use only
selected-ticket metadata and sanitized thread context. They must not use linked
tickets, saved views, customer-wide history, knowledge base content, or
workspace-wide context. AI Assistant output is a draft or suggestion until the
user explicitly accepts or submits through the existing update/send workflow.
The AI Assistant must not auto-send customer communication or run autonomous
provider writes.

When workspace AI is enabled, admins also see `Prompt Center` in Settings.
Prompt Center uses the same sidebar/detail pattern as Views: the sidebar groups
registered AI operations, ordered rephrase styles, and personal overrides when
available, while the detail pane edits the selected item. An operation declares
whether its editable text is a complete prompt or supplemental guidance.
Ticket-summary guidance is labelled as guidance and is shown beside a read-only
human-readable output contract. That contract makes the required Situation,
optional chronological Timeline, optional Next Risk, factuality, sanitization,
and 140-word limit visible without exposing raw model instructions. Admins can
edit or reset workspace configuration, create/edit/reorder/disable/remove
rephrase styles, and the inline editor shows active workspace styles in that
flat order.
Regular users see Prompt Center only when their workspace membership allows
personal rephrase style overrides. Those personal override controls replace the
selected style prompt only for that user in the active workspace.

`My Style` lives in `Settings -> My Style` under Workspace Settings because it
is scoped to the active workspace. It is shown only when workspace AI is enabled.
It must show the active workspace label and disable editing when the membership
does not allow `canEditMyStyle`.

## Production Data Boundary

The real `/workspace` route must not mix synthetic tickets with provider-backed
tickets. Without an active workspace it renders a disconnected state. Without
the signed-in user's active personal connection, it renders a personal
connection requirement with a path to workspace connection management and does
not read provider caches or call the provider.

Production workspace components live under `src/features/workspace/components`
and must not import provider services, repositories, server actions, or provider
plugin internals.
