// Sign-in for the whole app. Two modes, same screens:
//  - "local":    built-in accounts stored with the app data; passwords saved only as hashes.
//  - "firebase": Firebase Authentication stores logins; roles live in Firestore users/{uid}.
// Firebase mode switches on automatically when the VITE_FIREBASE_* variables are set.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AUTH_ENABLED } from './config';
import { hashPassword, verifyPassword, passwordProblem } from './password';
import { useStore } from '../store/store';
import { uid } from '../utils';

const AuthCtx = createContext(null);

// Shared with services/ai.js so API calls carry the signed-in user's token.
let tokenGetter = async () => null;
export const getAuthToken = () => tokenGetter();

const FRIENDLY_ERRORS = {
  'auth/invalid-credential': 'Email or password is incorrect.',
  'auth/wrong-password': 'Email or password is incorrect.',
  'auth/user-not-found': 'Email or password is incorrect.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/email-already-in-use': 'An account with this email already exists. Sign in instead.',
  'auth/weak-password': 'Use a password with at least 8 characters.',
  'auth/too-many-requests': 'Too many attempts. Wait a moment and try again.',
  'auth/popup-closed-by-user': 'The Google sign-in window was closed before finishing.',
  'auth/network-request-failed': 'Could not reach the sign-in service. Check your connection.',
  'permission-denied': 'Your account could not be set up. Ask an HR admin to check your access.',
};
const friendlyError = (e) => FRIENDLY_ERRORS[e?.code] || e?.message || 'Something went wrong. Try again.';

const isEmail = (v) => /^\S+@\S+\.\S+$/.test(v);

export const ROLE_NAMES = { owner: 'Project Owner', interviewer: 'Interviewer', candidate: 'Candidate', admin: 'Admin' };
const wrongRole = (expected, actual) =>
  `This isn't a ${ROLE_NAMES[expected]} account. Choose "${ROLE_NAMES[actual] || actual}" above to sign in.`;

export function AuthProvider({ children }) {
  const { db, currentUser, login, logout, signInWithProfile, createAccount, setPasswordHash } = useStore();
  const [fb, setFb] = useState(null);
  const [fbUser, setFbUser] = useState(null);
  const [checking, setChecking] = useState(AUTH_ENABLED);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const pendingName = useRef('');
  const expectedRole = useRef(null); // role picked on the sign-in page; checked once the profile loads

  // ---- Firebase mode: load the SDK and follow the signed-in user ----
  useEffect(() => {
    if (!AUTH_ENABLED) return undefined;
    let unsub = () => {};
    let live = true;
    import('./firebase.js').then((mod) => {
      if (!live) return;
      setFb(mod);
      tokenGetter = mod.getIdToken;
      unsub = mod.watchAuth(async (u) => {
        if (!u) { setFbUser(null); logout(); setChecking(false); return; }
        try {
          const profile = await mod.loadProfile(u, pendingName.current);
          const expected = expectedRole.current;
          expectedRole.current = null;
          if (expected && profile.role !== expected) {
            setError(wrongRole(expected, profile.role));
            await mod.logOut();
            return;
          }
          setFbUser(profile);
          signInWithProfile(profile);
        } catch (e) {
          setError(friendlyError(e));
          await mod.logOut();
        } finally {
          setChecking(false);
        }
      });
    });
    return () => { live = false; unsub(); };
  }, [signInWithProfile, logout]);

  const fail = (msg) => { setError(msg); return false; };
  const findByEmail = useCallback((email) => db.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase()), [db.users]);

  const runFirebase = useCallback(async (fn) => {
    setError(''); setNotice('');
    try { await fn(); return true; } catch (e) { expectedRole.current = null; return fail(friendlyError(e)); }
  }, []);

  const value = useMemo(() => {
    const mode = AUTH_ENABLED ? 'firebase' : 'local';
    const clear = () => { setError(''); setNotice(''); };

    return {
      mode,
      ready: !AUTH_ENABLED || (!!fb && !checking),
      signedIn: AUTH_ENABLED ? !!fbUser && !!currentUser : !!currentUser,
      error,
      notice,
      clear,

      async signIn(email, password, role) {
        clear();
        if (!isEmail(email)) return fail('Enter a valid email address.');
        if (!password) return fail('Enter your password.');
        expectedRole.current = role || null;
        if (mode === 'firebase') return runFirebase(() => fb.signInEmail(email.trim(), password));
        const user = findByEmail(email);
        expectedRole.current = null;
        if (!user || !verifyPassword(user, password)) return fail('Email or password is incorrect.');
        if (role && user.role !== role) return fail(wrongRole(role, user.role));
        login(user.id);
        return true;
      },

      // Self sign-up always creates a Candidate account. Staff roles come from an owner or HR admin.
      async signUp(name, email, password) {
        clear();
        if (!name.trim()) return fail('Enter your full name.');
        if (!isEmail(email)) return fail('Enter a valid email address.');
        const problem = passwordProblem(password);
        if (problem) return fail(problem);
        if (mode === 'firebase') {
          pendingName.current = name.trim();
          expectedRole.current = null;
          return runFirebase(() => fb.signUpEmail(name.trim(), email.trim(), password));
        }
        if (findByEmail(email)) return fail('An account with this email already exists. Sign in instead.');
        const id = uid('u');
        const e = email.trim().toLowerCase();
        createAccount({ id, role: 'candidate', name: name.trim(), email: e, title: 'Candidate', passwordHash: hashPassword(e, password) });
        login(id);
        return true;
      },

      signInWithGoogle(role) {
        if (mode !== 'firebase') return Promise.resolve(false);
        expectedRole.current = role || null;
        return runFirebase(() => fb.signInGoogle());
      },

      async resetPassword(email) {
        clear();
        if (!isEmail(email)) return fail('Enter your email address first.');
        if (mode === 'firebase') {
          const ok = await runFirebase(() => fb.resetPassword(email.trim()));
          if (ok) setNotice('If an account exists for that email, a reset link is on its way.');
          return ok;
        }
        setNotice('Built-in accounts cannot receive email. Ask your HR admin to set a new password for you.');
        return true;
      },

      async changePassword(current, next) {
        clear();
        if (mode === 'firebase') {
          const ok = await runFirebase(() => fb.resetPassword(currentUser.email));
          if (ok) setNotice(`We sent a password reset link to ${currentUser.email}.`);
          return ok;
        }
        const me = db.users.find((u) => u.id === currentUser.id);
        if (!verifyPassword(me, current)) return fail('Your current password is incorrect.');
        const problem = passwordProblem(next);
        if (problem) return fail(problem);
        setPasswordHash(me.id, hashPassword(me.email, next));
        setNotice('Password updated.');
        return true;
      },

      /** Built-in mode: hash for a new staff account. Firebase mode: create a role invite. */
      staffPasswordHash: (email, password) => hashPassword(email, password),
      invite: (email, role) => (fb ? fb.createInvite(email, role, fbUser?.uid || null) : Promise.resolve()),

      signOut() {
        clear();
        if (mode === 'firebase' && fb) return fb.logOut();
        logout();
        return Promise.resolve();
      },
    };
  }, [fb, fbUser, checking, currentUser, db.users, error, notice, findByEmail, runFirebase, login, logout, createAccount, setPasswordHash]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
