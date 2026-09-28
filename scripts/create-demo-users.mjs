// Creates the demo sign-in accounts in Firebase Authentication and their role
// profiles in Firestore, so everyone can sign in with a real email and password.
//
// One-time setup:
//   Firebase console → Project settings → Service accounts → Generate new private key.
//   Save the downloaded file in this project folder as  service-account.json
//   (it is in .gitignore — never share or commit it).
//
// Then run:
//   npm run create-demo-users
//
// Safe to run more than once: existing accounts get their name, password and role reset.

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const PASSWORD = process.env.DEMO_PASSWORD || 'Demo@2026';

// Must match the people in src/data/seed.js (same emails), so each login opens the right records.
const ACCOUNTS = [
  // Project Owner
  { email: 'ananya.rao@teksystems.demo', name: 'Ananya Rao', role: 'owner' },
  // HR Admins
  { email: 'meera.kapoor@teksystems.demo', name: 'Meera Kapoor', role: 'admin' },
  { email: 'james.whitfield@teksystems.demo', name: 'James Whitfield', role: 'admin' },
  // Interviewers
  { email: 'rahul.mehta@teksystems.demo', name: 'Rahul Mehta', role: 'interviewer' },
  { email: 'sarah.thomas@teksystems.demo', name: 'Sarah Thomas', role: 'interviewer' },
  { email: 'priya.nair@teksystems.demo', name: 'Priya Nair', role: 'interviewer' },
  { email: 'arjun.singh@teksystems.demo', name: 'Arjun Singh', role: 'interviewer' },
  { email: 'emily.clarke@teksystems.demo', name: 'Emily Clarke', role: 'interviewer' },
  { email: 'oliver.bennett@teksystems.demo', name: 'Oliver Bennett', role: 'interviewer' },
  { email: 'sneha.kulkarni@teksystems.demo', name: 'Sneha Kulkarni', role: 'interviewer' },
  // Candidates
  { email: 'neha.sharma@teksystems.demo', name: 'Neha Sharma', role: 'candidate' },
  { email: 'vikram.patel@teksystems.demo', name: 'Vikram Patel', role: 'candidate' },
  { email: 'charlotte.hughes@teksystems.demo', name: 'Charlotte Hughes', role: 'candidate' },
  { email: 'thomas.wright@teksystems.demo', name: 'Thomas Wright', role: 'candidate' },
];

// --- find credentials and project id ---
const keyPath = resolve('service-account.json');
let credential;
let keyProject;
if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  credential = applicationDefault();
} else if (existsSync(keyPath)) {
  const key = JSON.parse(readFileSync(keyPath, 'utf8'));
  credential = cert(key);
  keyProject = key.project_id;
} else {
  credential = applicationDefault(); // works after: gcloud auth application-default login
}

function projectFromEnvFile() {
  try {
    const line = readFileSync(resolve('.env.local'), 'utf8').split('\n').find((l) => l.startsWith('VITE_FIREBASE_PROJECT_ID='));
    return line?.split('=')[1]?.trim() || undefined;
  } catch {
    return undefined;
  }
}

const projectId = process.env.GOOGLE_CLOUD_PROJECT || keyProject || projectFromEnvFile();
if (!projectId) {
  console.error('Could not find your Firebase project id. Add service-account.json or set GOOGLE_CLOUD_PROJECT.');
  process.exit(1);
}

initializeApp({ credential, projectId });
const auth = getAuth();
const db = getFirestore();

console.log(`Creating demo accounts in project ${projectId}…\n`);
for (const a of ACCOUNTS) {
  let user;
  try {
    user = await auth.getUserByEmail(a.email);
    await auth.updateUser(user.uid, { password: PASSWORD, displayName: a.name });
  } catch (e) {
    if (e.code !== 'auth/user-not-found') throw e;
    user = await auth.createUser({ email: a.email, password: PASSWORD, displayName: a.name, emailVerified: true });
  }
  await db.doc(`users/${user.uid}`).set({ name: a.name, email: a.email, role: a.role, createdAt: FieldValue.serverTimestamp() });
  console.log(`✔ ${a.role.padEnd(11)} ${a.email}`);
}

console.log(`\nDone. All ${ACCOUNTS.length} accounts use the password: ${PASSWORD}`);
