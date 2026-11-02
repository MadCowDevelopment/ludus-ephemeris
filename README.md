# Ludus Ephemeris

A web-first archive for a personal board-game collection, play history, and long-term statistics. The web app is the primary collection and analysis experience; a native Android companion for quick play logging is planned separately.

## Run locally

Requirements: Node.js 22.12 or newer.

```sh
npm install
npm run dev
```

Without Firebase settings, the app opens in **sample mode**. Sample records and edits are saved in this browser's local storage; they are not cloud-backed. Use the collection's JSON export to keep a portable copy of preview data.

Run the production checks with:

```sh
npm run test
npm run build
```

## Connect Firebase

Create a Firebase project on the Spark plan, enable Google as an Authentication provider, and create a Cloud Firestore database. Copy `.env.example` to `.env.local` and fill in the Firebase web app configuration:

```dotenv
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
```

These are Firebase web-client identifiers, not service-account credentials. Do not put service-account keys in the browser app. Firestore records are stored below `users/{uid}/` and `firestore.rules` restricts access to the matching signed-in user.

Install the Firebase CLI, select your project, then deploy the rules and web build:

```sh
firebase login
firebase use --add
npm run build
firebase deploy --only firestore:rules,hosting
```

The app does not configure Firebase for you. Google sign-in, Firestore, hosting, and the environment values must all be set up in your own Firebase project before cloud storage is available.

## Workbook migration

Use **Collection → Import workbook** to preview an `.xlsx` or `.xlsm` workbook before merging it with the current archive. The importer reads the `Overview` catalog, year sheets with `Date`, `Name`, and `Duration` columns, historical ranking sheets (`PC100` and `Fame`), and `Predictions`. Go records are out of scope.

The preview reports duplicate catalog names, play titles missing from the catalog, and play rows skipped for an unreadable date or invalid duration. Extra source columns are retained as legacy fields. Formula cells are not treated as source records; derived metrics are recalculated from imported plays and catalog data. Import uses stable record IDs so a partially completed cloud import can be retried without duplicating those rows.

## Current scope

The web MVP includes Google sign-in and private Firestore records when configured, sample mode, collection browsing and sorting, play logging and history, workbook import, JSON export, and play/cost/ranking statistics. BoardGameGeek lookup, Android, offline mobile sync, recommendations, CLI access, and cross-user sharing are not implemented.
