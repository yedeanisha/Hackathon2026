// Everything that talks to Firebase lives here. This module is loaded only when
// Firebase is configured, so demo mode never downloads the Firebase SDK.
import { initializeApp } from 'firebase/app';
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signInWithPopup, GoogleAuthProvider, sendPasswordResetEmail, updateProfile, signOut,
} from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { firebaseConfig } from './config';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/**
 * Loads the user's profile (name, email, role) from Firestore users/{uid}.
 * On first sign-in it creates one: the role comes from an invite created by an
 * owner or HR admin, otherwise the person is a candidate. Firestore security
 * rules (firestore.rules) stop anyone from choosing their own role.
 */
export async function loadProfile(user, pendingName) {
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return { uid: user.uid, ...snap.data() };

  const email = (user.email || '').toLowerCase();
  let role = 'candidate';
  try {
    const invite = await getDoc(doc(db, 'invites', email));
    if (invite.exists()) role = invite.data().role;
  } catch {
    // No invite readable for this email: stays a candidate.
  }
  const profile = {
    name: pendingName || user.displayName || email.split('@')[0],
    email,
    role,
    createdAt: serverTimestamp(),
  };
  await setDoc(ref, profile);
  return { uid: user.uid, ...profile };
}

export function watchAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

export const signInEmail = (email, password) => signInWithEmailAndPassword(auth, email, password);

export async function signUpEmail(name, email, password) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: name });
  return cred;
}

export const signInGoogle = () => signInWithPopup(auth, new GoogleAuthProvider());

export const resetPassword = (email) => sendPasswordResetEmail(auth, email);

export const logOut = () => signOut(auth);

/** ID token for calls to the Cloud Run backend (verified there with firebase-admin). */
export const getIdToken = () => auth.currentUser?.getIdToken() ?? Promise.resolve(null);

/** Lets an owner or HR admin pre-assign a staff role to an email before the person signs up. */
export async function createInvite(email, role, invitedBy) {
  await setDoc(doc(db, 'invites', email.toLowerCase()), { role, invitedBy, createdAt: serverTimestamp() });
}
