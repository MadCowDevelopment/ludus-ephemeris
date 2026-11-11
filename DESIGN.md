# Ludus Ephemeris design

## Direction

Ludus Ephemeris is a personal statistical yearbook for board-game collections and play history. The interface should feel like a well-kept archive: calm, data-forward, and inviting to revisit. It should make logging a play easy without reducing the broader collection to a wall of dashboard cards.

## Visual system

- **Canvas:** cool off-white page surface, white record panels, and a persistent navy navigation rail. Dark mode uses layered navy surfaces with the same hierarchy.
- **Ink:** deep charcoal and navy for headings, navigation, and focused panels.
- **Action color:** cobalt for primary actions, links, and selected states.
- **Accent:** chartreuse for play-history charts and occasional emphasis; use coral sparingly.
- **Typography:** platform system sans-serif; use tabular figures and restrained letter spacing for numerical data.
- **Readability:** use system typography, 14px descriptive text, larger numeric highlights, and compact uppercase section labels. Mobile form inputs use 16px text to avoid automatic input zoom.
- **Structure:** persistent left navigation on desktop, clear section headings, ruled data tables, restrained radii, and generous but efficient spacing.
- **Brand mark:** a recognizable meeple holding a quill, reused as the browser favicon.
- **Game art:** small illustrative or cached cover thumbnails as an accent. Keep charts and records visually dominant; never use oversized art as the primary content.

## Page hierarchy

The overview places the play-log action first, then lifetime and current-year measures, an annual activity chart, recent plays, and the most-played games. Collection entry is secondary. Insights use the available width for time-series data and ranked comparisons. Collection and play-history views favor search, sorting, filters, and readable tabular detail.

The welcome screen pairs a short introduction with private sign-in and a clearly separated sample-archive option. Dashboard records sit in lightly outlined panels; chartreuse highlights the current-year callout rather than tinting the entire chart.

## Interaction and accessibility

- Keep play entry short and provide a title-search field with native datalist suggestions.
- Use clear labels, visible keyboard focus, semantic headings, descriptive chart buttons, and explicit error and import-review messages.
- Allow charts and lists to navigate to the corresponding history or ranking context.
- Recent plays open history filtered to that game and year; full history clears both filters. Most-played games open their collection detail, even when previous collection filters would hide them.
- Provide one-click search clearing, named compact navigation, selected-state semantics, and a skip-to-content link. Quick entry focuses the game search and uses the selected game's typical duration.
- Preserve useful layouts on narrow screens with compact navigation, stacked forms, and horizontally scrollable data tables.
- On phones, play history becomes compact two-line records and annual charts scroll inside their panels without widening the page.
- Respect reduced-motion preferences and do not rely on color alone to communicate selected or error states.

## Content and data

Use plain labels for derived measures and explain PC100 and cost-per-hour estimates. Distinguish sample records from a signed-in private archive. Treat workbook values as source records, preserve ambiguous fields, and make skipped rows visible in import preview.

## Implementation notes

The current web implementation is a visual prototype and its sample-mode records are synthetic. Replace illustrative covers only with artwork obtained through the planned one-time, cached lookup. Firebase configuration and account ownership are required before the cloud archive is available. The native Android app and offline sync are separate planned work.
