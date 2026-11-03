# Ludus Ephemeris

A web-first archive for a personal board-game collection, play history, and long-term statistics. The web app is the primary collection and analysis experience; a native Android companion for quick play logging is planned separately.

## Run locally

Requirements: Node.js 22.12 or newer.

```sh
npm install
npm run dev
```

The app is configured for the `ludus-ephemeris` Firebase project. You can also explore the sample archive; sample records and edits are saved in this browser's local storage and are not cloud-backed.

Run the production checks with:

```sh
npm run test
npm run build
```

## Connect Firebase

The app uses the public web app configuration in `src/lib/firebase-config.ts`. These client-side identifiers are not secrets. To point a local build at another Firebase project, copy `.env.example` to `.env.local` and provide overrides:

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

Google sign-in, Firestore, and Hosting are configured in the Firebase project. Firestore records are stored below `users/{uid}/`; `firestore.rules` restricts access to the matching signed-in user. Never put service-account keys in the browser app.

### Automatic deployment

The GitHub Actions workflow builds and tests on pushes to `master`, then deploys to the live Firebase Hosting site. It also supports manual runs from the repository's **Actions** tab. Deployment is skipped with a warning until its Firebase deployment credential is set.

To configure deployment without manually creating a Google Cloud service-account key:

1. Install and sign in to the Firebase CLI, then select the `ludus-ephemeris` project.
2. Run `firebase init hosting:github` and authorize the GitHub repository. Firebase creates a deployment service account and uploads its key to the repository as the `FIREBASE_SERVICE_ACCOUNT_LUDUS_EPHEMERIS` Actions secret.
3. Keep this repository's existing master-push workflow; it already builds, tests, and deploys the app. Do not add a separate pull-request deploy workflow unless preview deployments are wanted.

The Firebase project must have Hosting initialized. The workflow deploys Hosting only; deploy Firestore rules separately with `firebase deploy --only firestore:rules` when they change.

Signed-in records are loaded once when the app opens and can be reloaded with **Refresh**. Updates made in this app appear immediately; changes from another tab or device appear after refreshing. This avoids continuous Firestore listeners, which can incur additional reads when records change or connections restart.

## Workbook migration

Use **Collection → Import workbook** to preview an `.xlsx` or `.xlsm` workbook before merging it with the current archive. The importer reads the `Overview` catalog, year sheets with `Date`, `Name`, and `Duration` columns, and historical ranking sheets (`PC100` and `Fame`). Prediction sheets and Go records are ignored.

The preview reports duplicate catalog names, play titles missing from the catalog, and play rows skipped for an unreadable date or invalid duration. Extra source columns are retained as legacy fields. Formula cells are not treated as source records; derived metrics are recalculated from imported plays and catalog data. Import uses stable record IDs so a partially completed cloud import can be retried without duplicating those rows.

## Current scope

The web MVP includes Google sign-in and private Firestore records when configured, sample mode, collection browsing and sorting, play logging and history, workbook import, JSON export, and play/cost/ranking statistics. BoardGameGeek lookup, Android, offline mobile sync, recommendations, CLI access, and cross-user sharing are not implemented.
