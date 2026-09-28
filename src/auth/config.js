// Firebase settings come from environment variables (see .env.example).
// If they are missing, the app runs in demo mode with the role picker.
const env = import.meta.env || {};

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

/** True when real Firebase sign-in is configured. */
export const AUTH_ENABLED = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
