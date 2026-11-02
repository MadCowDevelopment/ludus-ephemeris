# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary user is a board-game owner who wants to manage a personal collection and understand long-term play habits. They use the web app for collection management and statistics, and a native Android companion mainly to log plays quickly.

## Product Purpose

Ludus Ephemeris replaces a long-running spreadsheet with a private, cloud-backed record of the user's board-game collection and plays. Success means making it easy to keep records current, explore years of play history, and make collection decisions from understandable statistics.

## Positioning

A personal board-game archive that turns a decade of collection and play records into useful, explorable statistics, with a web-first analysis experience and a phone companion for capturing plays.

## Operating Context

The source is `Cost for games per hour.xlsx`, with collection details, annual play logs from 2015 onward, rankings, prediction lists, and a separate Go log that is out of scope. The workbook contains thousands of play records and historical formula-driven analyses. The web app is the primary home for browsing, managing, importing, and analyzing records; Android prioritizes quick play entry.

## Capabilities and Constraints

- The initial web experience includes private Google sign-in, a personal collection, play logging and history, workbook import/export, and statistics.
- The web landing page should foreground a quick way to log a play, then show the most important statistics with clear paths to deeper analysis. Adding games matters but is less frequent and should be a secondary action.
- Game recommendations are a possible future enhancement, not an initial-release requirement.
- Firebase Spark is the selected initial backend: Firebase Authentication, Cloud Firestore, and Firebase Hosting. Keep the initial implementation within the no-cost plan's limits and avoid services requiring a billing-enabled plan unless explicitly reconsidered.
- Each Google account has its own private records. Sharing individual records is out of scope for the first release; aggregate sharing may be reconsidered later.
- Android should support offline edits with queued synchronization and visible sync state; it follows the web MVP.
- Preserve source workbook values, including ambiguous legacy fields, for user review during import. Recalculate derived metrics rather than relying on spreadsheet formulas or cached values.
- Use the main workbook PC100 scoring approach initially, but keep its weights and formula adjustable and explain its components.
- BGG access is heavily restricted. When metadata/artwork lookup is implemented, use a one-time lookup where possible and cache results; do not automatically refresh or repeatedly call BGG.
- Go logs, CLI support, and data sharing are not part of the initial release.
- Workbook imports should surface duplicate and unmatched titles for review; unmatched play titles are retained as unowned records, while duplicate source rows receive distinct record IDs.
- Firestore reporting and data-model tradeoffs should be revisited as the archive's analytics and Android client grow.

## Brand Commitments

- The website name is **Ludus Ephemeris**, matching the repository name.
- No other visual identity, logo, or brand assets are established.
- Use synthetic box-cover illustrations as small accents; keep the statistics and records visually dominant.

## Evidence on Hand

- The attached workbook `Cost for games per hour.xlsx` is the authoritative source for the initial migration. It has annual play logs spanning 2015 onward, a collection overview, rankings and analytics, historical predictions, and a separate Go sheet excluded from scope.
- Workbook formulas and chart caches may be stale or unsupported outside their original spreadsheet environment; use source records as input and compute derived statistics in the app.
- No production brand assets or user-provided visual identity are established.

## Product Principles

- Keep the archive personal and private by default.
- Make play capture quick, while giving statistics room to be explored on the web.
- Preserve historical information and make data transformations explicit.
- Explain scores and derived metrics instead of presenting opaque rankings.
- Never let sync or import failure silently discard user data.
