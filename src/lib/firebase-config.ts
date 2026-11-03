const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyB7HnywQ32BNXcjzm7QM4AcZ2PIWpuFg1c",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "ludus-ephemeris.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "ludus-ephemeris",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:924144310954:web:90c688799e7a52db0c0ed3",
};

export const firebaseConfigured = Object.values(firebaseConfig).every(
  (value) => typeof value === "string" && value.trim().length > 0,
);

export default firebaseConfig;
