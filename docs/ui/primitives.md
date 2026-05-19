# UI Primitives

Shared primitives provide the compact controls used by product screens. Product
screens should consume these controls instead of redefining interaction behavior
inline.

## Primitive Set

- `Button`: compact command button with primary, secondary, and ghost variants.
- `Checkbox`: native checkbox with label, help text, error, disabled, and
  indeterminate support.
- `Tooltip`: non-interactive hover/focus help text.
- `DropdownSelect`: single-select dropdown for fixed option lists.
- `SearchableDropdown`: single-select combobox with local filtering.
- `MenuDropdown`: action menu with optional headings and separators.
- `ProfileMenu`: generic profile-style menu trigger and menu composition.
- `TicketTab`: single open-ticket tab control with active, unread, dirty,
  loading, and close affordances.
- `TableHeaderCell`: sortable and resizable table header affordance.
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

Width is content-driven by default. Triggers do not set a default minimum width.
Menus use natural content width, stay at least as wide as the trigger, and use a
standard Tailwind maximum width only as an overflow guard. The searchable input
fills the open menu but does not set menu width.

Menus reuse the same row rhythm where possible, but may include headings,
separators, and actions because they are menus rather than selects.

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
- Does not contain interactive controls.

`TableHeaderCell`:

- Sort activation calls the supplied sort callback.
- Resize affordance calls pointer and keyboard resize callbacks.
- ArrowLeft and ArrowRight resize by the standard step; Shift uses a larger
  step.
- Column width persistence belongs to a later product layer.
