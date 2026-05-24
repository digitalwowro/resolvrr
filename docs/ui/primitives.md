# UI Primitives

Shared primitives provide the compact controls used by product screens. Product
screens should consume these controls instead of redefining interaction behavior
inline.

## Primitive Set

- `Button`: compact command button with primary, secondary, and ghost variants.
- `Checkbox`: native checkbox with label, help text, error, disabled, and
  indeterminate support.
- `Tooltip`: non-interactive hover/focus help content.
- `DropdownSelect`: single-select dropdown for fixed option lists.
- `SearchableDropdown`: single-select combobox with local filtering.
- `MenuDropdown`: action menu with optional headings and separators.
- `ProfileMenu`: generic profile-style menu trigger and menu composition.
- `TicketTab`: single open-ticket tab control with active, unread, dirty,
  loading, and close affordances.
- `ToolbarButton`, `ToolbarDropdownSelect`, `ToolbarSearchableDropdown`, and
  `ToolbarMenuDropdown`: compact toolbar wrappers over the base primitives.
- `TableRoot`, `Table`, `TableHeader`, `TableBody`, `TableRow`,
  `TableCell`, and `TableHeadStaticCell`: shared table shell, sticky header,
  and compact row rhythm primitives.
- `TableHeaderCell`: sortable and resizable table header affordance.
- `useTableSort`: shared sort-state hook for sortable table headers.
- `Spinner` and `LoadingState`: compact loading indicators.
- `StatusBadge`: compact provider-neutral state badge.

## Dropdown Contract

Dropdown options use this shared shape:

```ts
type DropdownOption = {
  value: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
};
```

Dropdown rows are single-line rows. They do not include descriptions or
multi-line explanatory content. Add extra explanation with a nearby tooltip or
help pattern outside the option row.

Both searchable and non-searchable dropdowns share the same visual system:

- same trigger style;
- same menu shell;
- same option row height, padding, and font size;
- same hover, highlighted, selected, disabled, and focus treatment;
- same natural width behavior;
- same outside-click close behavior.

Dropdown children inherit the menu font size. Base dropdown menus use `text-sm`;
toolbar dropdown wrappers pass their compact `text-xs` size to the menu so rows
match the toolbar trigger.

Dropdown icons use the shared dropdown icon class so they scale with the current
dropdown font size instead of a fixed spacing token.

Width is content-driven by default. The dropdown wrapper is measured by an
invisible sizing layer that includes the closed trigger and every full option
row. Hidden measurement rows do not truncate and do not use flexible text
growth. Visible triggers, search inputs, menus, and option rows fill the
measured width. A standard Tailwind maximum width is used only as an overflow
guard, and visible row text truncates only after that guard is reached.

Selected and keyboard-active states are separate. Opening a dropdown shows the
selected row with accent text and a check icon, but it does not receive the
active/hover background until the user moves through the menu or filters a
searchable list.

Dense product toolbars may tighten trigger height and padding while preserving
the shared dropdown behavior and menu rhythm.

Menus reuse the same row rhythm where possible, but may include headings,
separators, and actions because they are menus rather than selects.

## Toolbar Controls

Toolbar wrappers compose the base button and dropdown primitives for dense
toolbar rows. They apply compact trigger/button sizing: `h-6`, `px-2`,
`text-xs`, `gap-1`, and normal font weight. Toolbar dropdown wrappers also pass
`text-xs` to their menus so option rows inherit the same font size. They do not
change base primitive defaults, dropdown option rhythm, width behavior,
keyboard behavior, or outside-click behavior.

## Keyboard Behavior

`DropdownSelect`:

- Enter, Space, ArrowDown, or ArrowUp opens the menu.
- Toolbar or icon-adjacent dropdowns should provide a stable accessible label.
- ArrowUp and ArrowDown move the highlighted enabled option.
- First-letter typeahead jumps to the first matching enabled option and cycles
  through repeated matching keys.
- Enter selects the highlighted option.
- Escape closes the menu.

`SearchableDropdown`:

- Opening shows all options and focuses the search input.
- Filtering starts only after typing.
- ArrowUp and ArrowDown move the highlighted enabled option.
- Enter selects the highlighted option.
- If the filtered list has exactly one enabled option, Enter selects it.
- Escape closes the menu.

`MenuDropdown` and `ProfileMenu`:

- Enter, Space, or ArrowDown opens the menu.
- ArrowUp, ArrowDown, Home, and End move between enabled menu items.
- First-letter typeahead moves through enabled menu items and skips headings and
  separators. Repeated letters cycle downward and wrap.
- Enter or Space activates the highlighted item.
- Escape closes the menu and restores focus to the trigger.
- Tab closes the menu and allows natural focus movement.

`Tooltip`:

- Opens on hover or keyboard focus after a short delay.
- Closes on blur, pointer leave, or Escape.
- Uses `aria-describedby` while visible.
- Accepts plain text or short rich content through `content`.
- Does not contain interactive controls.

## Table Contract

Table primitives provide structure, surface, and rhythm only:

- `TableRoot` owns the scroll container, rounded surface, border, overflow, and
  white background.
- `Table` owns the base table layout: full width, fixed table layout, separated
  borders, and zero border spacing.
- `TableHeader` provides the sticky header layer.
- `TableCell` provides body cell rhythm with `h-11`, `px-2`, and row dividers.
- `TableHeadStaticCell` provides static header cells for non-sortable columns.
- `TableHeaderCell` provides sortable header controls and optional resize
  callbacks.

`useTableSort` owns only sort interaction state: active sort key, direction,
same-key toggling, explicit `setSort`, new-key direction, and `sortDirectionFor`.
Row comparison and data sorting stay in the feature that owns the data shape.

## Table Keyboard Behavior

`TableHeaderCell`:

- Sort activation calls the supplied sort callback.
- Resize affordance calls pointer and keyboard resize callbacks.
- ArrowLeft and ArrowRight resize by the standard step; Shift uses a larger
  step.
- Column width persistence belongs to a later product layer.
