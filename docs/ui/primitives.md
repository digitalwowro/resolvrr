# UI Primitives

Shared primitives should be built before product screens depend on them
repeatedly. Product screens should consume these primitives instead of inventing
new interaction behavior inline.

## Initial Primitive Families

- Compact button.
- Checkbox.
- Custom tooltip.
- Searchable dropdown.
- Non-searchable dropdown.
- Profile/menu dropdown.
- Table header cell with sort and resize affordances.
- Ticket tab.
- Spinner/loading state.
- Status badge.

Dropdowns and menus should share a compact visual rhythm, keyboard navigation,
outside-click close behavior, and fixed-position portal behavior when needed to
escape clipping parents.
