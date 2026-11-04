# Ludus Ephemeris design

## Direction

Ludus Ephemeris is a personal statistical yearbook for board-game collections and play history. The interface should feel like a well-kept archive: calm, data-forward, and inviting to revisit. It should make logging a play easy without reducing the broader collection to a wall of dashboard cards.

## Visual system

- **Canvas:** cool off-white page surface with white table and navigation surfaces.
- **Ink:** deep charcoal and navy for headings, navigation, and focused panels.
- **Action color:** cobalt for primary actions, links, and selected states.
- **Accent:** chartreuse for play-history charts and occasional emphasis; use coral sparingly.
- **Typography:** platform system sans-serif; use tabular figures and restrained letter spacing for numerical data.
- **Readability:** body text starts at 16px; supporting labels stay legible and subordinate rather than being reduced to microcopy.
- **Structure:** persistent left navigation on desktop, clear section headings, ruled data tables, restrained radii, and generous but efficient spacing.
- **Brand mark:** a recognizable meeple holding a quill, reused as the browser favicon.
- **Game art:** small illustrative or cached cover thumbnails as an accent. Keep charts and records visually dominant; never use oversized art as the primary content.

## Page hierarchy

The overview places the play-log action first, then lifetime and current-year measures, an annual activity chart, recent plays, and the most-played games. Collection entry is secondary. Insights use the available width for time-series data and ranked comparisons. Collection and play-history views favor search, sorting, filters, and readable tabular detail.

## Interaction and accessibility

- Keep play entry short and provide a title-search field with native datalist suggestions.
- Use clear labels, visible keyboard focus, semantic headings, descriptive chart buttons, and explicit error and import-review messages.
- Allow charts and lists to navigate to the corresponding history or ranking context.
- Preserve useful layouts on narrow screens with compact navigation, stacked forms, and horizontally scrollable data tables.
- Respect reduced-motion preferences and do not rely on color alone to communicate selected or error states.

## Content and data

Use plain labels for derived measures and explain PC100 and cost-per-hour estimates. Distinguish sample records from a signed-in private archive. Treat workbook values as source records, preserve ambiguous fields, and make skipped rows visible in import preview.

## Implementation notes

The current web implementation is a visual prototype and its sample-mode records are synthetic. Replace illustrative covers only with artwork obtained through the planned one-time, cached lookup. Firebase configuration and account ownership are required before the cloud archive is available. The native Android app and offline sync are separate planned work.
