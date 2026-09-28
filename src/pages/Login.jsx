// Sign-in page: choose a role, then email and password. Candidates can also create an account.
import { useState } from 'react';
import {
  LuUsers, LuFolderKanban, LuClipboardCheck, LuUser, LuShieldCheck, LuEye, LuEyeOff, LuMail, LuCircleCheck, LuCircleAlert, LuArrowLeft,
} from 'react-icons/lu';
import { useAuth, ROLE_NAMES } from '../auth/AuthProvider';
import { Button, Field, Input, cx } from '../components/ui';

const ROLES = [
  { id: 'owner', icon: LuFolderKanban },
  { id: 'interviewer', icon: LuClipboardCheck },
  { id: 'candidate', icon: LuUser },
  { id: 'admin', icon: LuShieldCheck },
];

function PasswordInput({ id, value, onChange, autoComplete }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input id={id} type={show ? 'text' : 'password'} value={value} onChange={onChange} autoComplete={autoComplete} className="pr-10" />
      <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-2 top-1.5 rounded p-1 text-slate-400 hover:text-slate-600">
        {show ? <LuEyeOff className="h-4 w-4" /> : <LuEye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function GoogleButton({ onClick, busy }) {
  return (
    <Button variant="secondary" className="w-full" onClick={onClick} loading={busy}>
      <svg className="h-4 w-4" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
        <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
      </svg>
      Continue with Google
    </Button>
  );
}

export default function Login() {
  const auth = useAuth();
  const [role, setRole] = useState('owner');
  const [mode, setMode] = useState('signin'); // signin | signup (candidates only)
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState('');

  const go = async (key, fn) => { setBusy(key); await fn(); setBusy(''); };
  const pickRole = (r) => { setRole(r); setMode('signin'); auth.clear(); };
  const signingUp = role === 'candidate' && mode === 'signup';

  const submit = (e) => {
    e.preventDefault();
    go('submit', () => (signingUp ? auth.signUp(name, email, password) : auth.signIn(email, password, role)));
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-900 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500 text-navy-900"><LuUsers className="h-5 w-5" /></span>
          <span className="text-2xl font-bold uppercase tracking-wide text-white">Panelist</span>
        </div>

        <div className="rounded-xl border-t-4 border-orange-500 bg-white p-6 shadow-2xl sm:p-8">
          {!signingUp && (
            <>
              <p className="text-sm font-semibold text-slate-700">Sign in as</p>
              <div className="mt-2 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Sign in as">
                {ROLES.map((r) => {
                  const active = role === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => pickRole(r.id)}
                      className={cx(
                        'flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition',
                        active ? 'border-indigo-600 bg-indigo-50 text-indigo-800 ring-1 ring-indigo-600' : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                      )}
                    >
                      <r.icon className={cx('h-4 w-4 shrink-0', active ? 'text-indigo-600' : 'text-slate-400')} />
                      {ROLE_NAMES[r.id]}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {signingUp && (
            <>
              <button type="button" onClick={() => { setMode('signin'); auth.clear(); }} className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
                <LuArrowLeft className="h-4 w-4" /> Back to sign in
              </button>
              <h1 className="text-xl font-bold">Create your candidate account</h1>
            </>
          )}

          <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
            {signingUp && (
              <Field label="Full name">
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
              </Field>
            )}
            <Field label="Email">
              <div className="relative">
                <LuMail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input id="email" type="email" className="pl-9" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
              </div>
            </Field>
            <Field label="Password" hint={signingUp ? 'At least 8 characters, with letters and numbers.' : undefined}>
              <PasswordInput id="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={signingUp ? 'new-password' : 'current-password'} />
            </Field>

            {!signingUp && (
              <div className="-mt-2 text-right">
                <button type="button" onClick={() => go('reset', () => auth.resetPassword(email))} className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
                  Forgot password?
                </button>
              </div>
            )}

            {auth.error && <p className="flex items-start gap-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-700"><LuCircleAlert className="mt-0.5 h-4 w-4 shrink-0" />{auth.error}</p>}
            {auth.notice && <p className="flex items-start gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800"><LuCircleCheck className="mt-0.5 h-4 w-4 shrink-0" />{auth.notice}</p>}

            <Button type="submit" className="w-full" loading={busy === 'submit'}>
              {signingUp ? 'Create account' : `Sign in as ${ROLE_NAMES[role]}`}
            </Button>
          </form>

          {role === 'candidate' && auth.mode === 'firebase' && (
            <>
              <div className="my-5 flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200" />or<span className="h-px flex-1 bg-slate-200" /></div>
              <GoogleButton busy={busy === 'google'} onClick={() => go('google', () => auth.signInWithGoogle(signingUp ? null : 'candidate'))} />
            </>
          )}

          {role === 'candidate' && !signingUp && (
            <p className="mt-6 text-center text-sm text-slate-600">
              New candidate?{' '}
              <button type="button" onClick={() => { setMode('signup'); auth.clear(); }} className="font-semibold text-indigo-600 hover:text-indigo-800">Create an account</button>
            </p>
          )}
          {role !== 'candidate' && (
            <p className="mt-6 text-center text-xs text-slate-500">Staff accounts are set up by your Admin.</p>
          )}
        </div>
      </div>
    </div>
  );
}
