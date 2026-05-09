# @nac-spec/cookbook -- 30 resolved patterns

Each pattern is a self-contained recipe: HTML markup + manifest
snippet + tests + 1-paragraph explanation. Patterns target the
30 most common interactive UI scenarios.

## Index (skeleton -- full content phase 4)

### Forms
1. `form-text-field` -- single text input with validation
2. `form-multi-step-wizard` -- N-step wizard with back/next
3. `form-with-validation-errors` -- inline error display
4. `form-async-submit` -- submit + loading + success/error
5. `form-conditional-fields` -- field visibility based on other field

### Lists
6. `list-virtualized` -- 10k rows with `declareVirtual`
7. `list-with-search` -- filter input + reactive results
8. `list-paginated` -- next/prev with cursor
9. `list-with-multi-select` -- checkbox per row + bulk actions
10. `list-drag-reorder` -- HTML5 drag-and-drop

### Modals & overlays
11. `modal-with-form` -- dialog + form + focus trap
12. `modal-confirm-irreversible` -- destructive action with `a11y_hint`
13. `modal-multi-step` -- sequential modals with breadcrumb
14. `dropdown-menu` -- click-to-open menu
15. `dropdown-autocomplete` -- typeahead with declared options

### Navigation
16. `navigation-tabs` -- horizontal tab strip
17. `navigation-breadcrumb` -- click-to-navigate trail
18. `navigation-sidebar-tree` -- hierarchical menu
19. `navigation-stepper` -- linear progress indicator

### Data viz
20. `chart-clickable` -- chart with click-to-drill-down
21. `data-table-sortable` -- sortable columns
22. `data-table-filterable` -- column filters
23. `kanban-board` -- drag cards between columns

### Media
24. `video-player-controls` -- play/pause/scrub controls
25. `image-gallery-lightbox` -- click-to-zoom
26. `audio-recorder` -- record + playback

### Specialised
27. `signature-pad` -- draw signature with mouse/touch
28. `barcode-scanner` -- camera-based scan (mobile)
29. `voice-recorder` -- press-to-talk with transcription
30. `geo-map-with-markers` -- interactive map with clickable pins

---

## Status (2026-05-09)

Skeleton index. Each pattern's full markup + manifest + tests +
explanation lands in NAC v2.0 phase 4.

Patterns 1-3, 11, 14 are highest priority -- they cover ~70% of
typical CRM-style UI.
