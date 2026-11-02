# Board-game collection and plays app requirements

## Product goal

Replace the spreadsheet with a private, cloud-backed board-game collection and play-tracking product. Make the dedicated, large-screen web app the primary experience for collection management and statistics. Provide a native Android companion focused on quickly logging plays. Both apps share the same account data.

The source workbook is `Cost for games per hour.xlsx`. It contains annual play logs from 2015 onward, a collection overview, calculation and ranking sheets, prediction records, and a separate Go log. Go records are out of scope for the app. Workbook formulas and chart caches are not a reliable data format on their own; the app must preserve the relevant underlying records and calculate current metrics from them.

## Platform decision

- Use Firebase Spark for the initial cloud backend: Firebase Authentication and Cloud Firestore for shared Android/web accounts and records, with Firebase Hosting for the web app.
- Let each user sign in with their Google account and maintain a separate, private collection and play history.
- Do not support sharing individual records or collections in the first release. Aggregate sharing may be considered later as a separate, privacy-conscious feature.
- Let Android create and edit records offline, queue changes, and sync them when connectivity returns. Make pending changes, sync failures, and conflicts visible and recoverable.
- Keep the initial implementation within Spark's no-cost quotas and avoid services that require a billing-enabled plan unless that changes through an explicit later decision.
- Use Firestore security rules to isolate each account's private records. Plan the data model for reporting because Firestore is not a relational SQL database.

## Requirements derived from the workbook

### Collection

- Maintain a searchable, sortable collection catalog with one record per game.
- Preserve the workbook's catalog fields where present: game name, solo-play suitability, default/typical duration, acquisition date, purchase and sale prices, ownership/location status, authenticity and delivery status, personal rating, desire-to-play rating, and BoardGameGeek/image identifiers and microbadge.
- Use a game's BGG identifier for a one-time metadata/artwork lookup when available, then cache the result for use by both apps. Do not automatically refresh cached results or repeatedly call BGG; respect its API access restrictions.
- Preserve legacy fields even where their meaning is unclear, and let the owner review or map them during import rather than silently discarding them.
- Show per-game play count, total time played, solo and multiplayer time, average duration, most recent play, and cost per hour.
- Show the remaining estimated plays needed to reach the workbook's cost-per-hour targets (€20, €10, €5, €2, and €1), based on the game's average duration and net cost. Label this as an estimate and define the calculation in the interface.

### Play history

- Record each play with a date, game, duration, and optional description/notes and score.
- Retain legacy play attributes when available, including deck, opponent identity, result, image identifier, and any other source columns found during import.
- Allow multiple plays of the same game on the same day and retain the original date and duration values.
- Browse and filter play history by date/year, game, and other available play attributes.
- Show per-year and all-time play counts and time played, and use the same play records for collection metrics and rankings.

### Statistics, rankings, and collection review

- Provide a collection overview with totals and per-game cost/value and play metrics.
- Provide yearly play summaries and annual game rankings, including the workbook's top-played games and top games by total play time.
- Provide a PC100-style ranked list using the main `PC100` sheet's scoring approach: recency-adjusted solo play time, cost per hour, personal rating, and desire-to-play rating. Document and expose the score components; keep the formula and weights easy to revisit and adjust. Preserve historical yearly ranking data on import rather than recalculating it as if the current formula had always applied.
- Provide collection review lists for unplayed solo and multiplayer games, games not played recently, and play counts by year.
- Show remaining plays to cost/value targets, games in price bands, and money spent on games with no plays or high purchase prices.
- Provide charts for play-count distribution and acquisition spending over time. Let users filter statistics by year or date range and open a game or play from a chart/list where applicable.

## Product requirements from the request

### Android app

- Deliver a native Android experience, not merely a mobile-sized web page.
- Make logging a play quick and straightforward, with a fast game picker and minimal required fields.
- Support reviewing recent plays and finding a game when needed; detailed collection management and statistical analysis are primarily web-app workflows.
- Show sync state and make unsynced changes, sync errors, and conflicts visible; do not silently lose user edits.
- Support offline creation and editing, then synchronize queued changes when connectivity returns.

### Web app

- Treat the dedicated web application, optimized for desktop and large screens, as the primary product experience.
- Make collection management, play-history browsing, and statistics first-class web workflows.
- On the landing page, foreground a quick play-log action with game search, then show important personal statistics with straightforward drill-down. Make adding a game a secondary action because collection additions are less frequent.
- Treat game recommendations as a future possibility, not first-release scope.
- Use the additional space for richer statistical dashboards, multi-year comparisons, interactive charts, sortable tables, and drill-down from summaries to games and plays.
- Keep the web app's collection, records, calculations, and filters consistent with Android.

### Cloud storage and account data

- Store the user's collection, plays, and preferences in cloud storage and make them available on both apps.
- Use the selected Firebase Authentication and Cloud Firestore backend so native Android and web clients share accounts and data.
- Sign in with Google; keep each account's records private and separate from every other user's records.
- Keep personal data private to its account. Design for reliable synchronization and recovery rather than treating a device or spreadsheet as the only copy.
- Preserve dates, durations, prices, scores, and optional legacy attributes without lossy conversion.
- Provide a workbook import flow with a preview, validation, duplicate/unmatched-game handling, and a clear report of any records or fields that could not be imported.
- Recalculate derived metrics from imported records; do not depend on Excel formulas or cached chart/formula values.
- Provide a portable export of the user's records.

## Quality requirements

- Use a modern, polished visual design with legible data presentation and uncluttered navigation.
- Make essential flows usable on Android touch screens and make statistics comfortable to inspect on a large display.
- Use accessible labels, sufficient contrast, and clear empty, loading, validation, and error states.
- Support the historical data volume and continued growth without requiring a separate worksheet or manual formula maintenance for each year.
- Treat currency and date display as user/data settings; do not hard-code workbook-specific formatting into calculations.
