// Page frame after sign-in: navy sidebar with the role's menu, top bar with
// notifications and the account menu (change password, sign out).
import { useEffect, useRef, useState } from 'react';
import {
  LuLayoutDashboard, LuFolderKanban, LuUsers, LuClipboardCheck, LuBell, LuShieldCheck, LuMenu, LuX,
  LuLogOut, LuRotateCcw, LuGavel, LuChevronDown, LuKeyRound,
} from 'react-icons/lu';
import { NavLink, useNavigate } from '../router';
import { useStore } from '../store/store';
import { Avatar, cx, Modal, Button, Field, Input } from './ui';
import { useAuth } from '../auth/AuthProvider';
import { timeAgo } from '../utils';

const ROLE_LABEL = { owner: 'Project Owner', interviewer: 'Interviewer', admin: 'HR Admin', candidate: 'Candidate' };

const NAV = {
  owner: [
    { to: '/', label: 'Dashboard', icon: LuLayoutDashboard, end: true },
    { to: '/projects', label: 'Projects', icon: LuFolderKanban },
    { to: '/approvals', label: 'Approvals', icon: LuGavel, badge: 'approvals' },
    { to: '/interviewers', label: 'Interviewers', icon: LuUsers },
    { to: '/audit', label: 'Audit log', icon: LuShieldCheck },
  ],
  interviewer: [
    { to: '/', label: 'My interviews', icon: LuClipboardCheck, end: true, badge: 'todo' },
  ],
  candidate: [
    { to: '/', label: 'My applications', icon: LuLayoutDashboard, end: true },
    { to: '/jobs', label: 'Open roles', icon: LuFolderKanban },
  ],
  admin: [
    { to: '/', label: 'Dashboard', icon: LuLayoutDashboard, end: true },
    { to: '/projects', label: 'Projects', icon: LuFolderKanban },
    { to: '/interviewers', label: 'Interviewers', icon: LuUsers },
    { to: '/audit', label: 'Audit log', icon: LuShieldCheck },
  ],
};

function useBadgeCounts() {
  const { db, currentUser } = useStore();
  const approvals = db.finalDecisions.filter((f) => {
    if (f.ownerStatus !== 'pending') return false;
    const a = db.assignments.find((x) => x.id === f.assignmentId);
    const p = db.projects.find((x) => x.id === a?.projectId);
    return p?.ownerId === currentUser.id;
  }).length;
  const todo = db.assignments.filter((a) => {
    if (!a.interviewerIds.includes(currentUser.id)) return false;
    const mine = db.feedback.some((f) => f.assignmentId === a.id && f.interviewerId === currentUser.id);
    const fin = db.finalDecisions.find((f) => f.assignmentId === a.id);
    const allIn = db.feedback.filter((f) => f.assignmentId === a.id).length >= a.interviewerIds.length;
    const fdmTodo = a.fdmId === currentUser.id && allIn && (!fin || fin.ownerStatus === 'returned');
    return !mine || fdmTodo;
  }).length;
  return { approvals, todo };
}

function Sidebar({ onNavigate }) {
  const { currentUser } = useStore();
  const counts = useBadgeCounts();
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2.5 px-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 text-navy-900">
          <LuUsers className="h-4 w-4" />
        </span>
        <div className="leading-tight">
          <p className="text-lg font-bold uppercase tracking-wide text-white">Panelist</p>
          <p className="text-[11px] uppercase tracking-wider text-slate-400">Interview management</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4" onClick={onNavigate}>
        {NAV[currentUser.role].map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cx(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive ? 'border-l-4 border-orange-500 bg-white/10 pl-2 text-white' : 'border-l-4 border-transparent pl-2 text-slate-300 hover:bg-white/5 hover:text-white'
              )
            }
          >
            <item.icon className="h-4 w-4" />
            <span className="flex-1">{item.label}</span>
            {item.badge && counts[item.badge] > 0 && (
              <span className="rounded-full bg-orange-500 px-1.5 py-0.5 text-[11px] font-bold text-navy-900 tabular-nums">{counts[item.badge]}</span>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

function NotificationBell() {
  const { db, currentUser, markRead, markAllRead } = useStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const mine = db.notifications.filter((n) => n.userId === currentUser.id).slice(0, 20);
  const unread = mine.filter((n) => !n.read).length;

  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const dot = { reminder: 'bg-amber-500', escalation: 'bg-rose-500', approval: 'bg-indigo-500', action: 'bg-violet-500', assignment: 'bg-sky-500', completion: 'bg-emerald-500' };

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} aria-label="Notifications" className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700">
        <LuBell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">{unread}</span>
        )}
      </button>
      {open && (
        <div className="animate-fade-in fixed inset-x-4 top-16 z-40 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-96">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold">Notifications</p>
            {unread > 0 && <button onClick={markAllRead} className="text-xs font-medium text-indigo-600 hover:text-indigo-800">Mark all read</button>}
          </div>
          <div className="max-h-96 overflow-y-auto scrollbar-thin">
            {mine.length === 0 && <p className="px-4 py-8 text-center text-sm text-slate-500">You're all caught up.</p>}
            {mine.map((n) => (
              <button
                key={n.id}
                onClick={() => { markRead(n.id); setOpen(false); if (n.link) navigate(n.link); }}
                className={cx('flex w-full gap-3 border-b border-slate-50 px-4 py-3 text-left hover:bg-slate-50', !n.read && 'bg-indigo-50/40')}
              >
                <span className={cx('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.read ? 'bg-slate-200' : dot[n.type] || 'bg-slate-400')} />
                <span className="min-w-0">
                  <span className={cx('block text-sm', n.read ? 'text-slate-600' : 'font-medium text-slate-900')}>{n.text}</span>
                  <span className="text-xs text-slate-400">{timeAgo(n.at)}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ChangePasswordModal({ open, onClose }) {
  const auth = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState(false);
  const close = () => { setCurrent(''); setNext(''); auth.clear(); onClose(); };
  const save = async () => {
    setBusy(true);
    const ok = await auth.changePassword(current, next);
    setBusy(false);
    if (ok && auth.mode === 'local') { setCurrent(''); setNext(''); }
  };
  return (
    <Modal
      open={open}
      onClose={close}
      title="Change password"
      footer={<><Button variant="secondary" onClick={close}>Close</Button><Button loading={busy} onClick={save}>{auth.mode === 'firebase' ? 'Email me a reset link' : 'Update password'}</Button></>}
    >
      {auth.mode === 'local' ? (
        <div className="space-y-4">
          <Field label="Current password"><Input id="current-password" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} /></Field>
          <Field label="New password" hint="At least 8 characters, with letters and numbers."><Input id="new-password" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} /></Field>
        </div>
      ) : (
        <p className="text-sm text-slate-600">We'll email you a secure link to set a new password.</p>
      )}
      {auth.error && <p className="mt-4 text-sm text-rose-600">{auth.error}</p>}
      {auth.notice && <p className="mt-4 text-sm text-emerald-700">{auth.notice}</p>}
    </Modal>
  );
}

function UserMenu() {
  const { currentUser, resetDemo } = useStore();
  const auth = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  const item = 'flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50';
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 rounded-lg p-1 pr-2 hover:bg-slate-100">
        <Avatar name={currentUser.name} size="sm" />
        <span className="hidden text-left leading-tight sm:block">
          <span className="block text-sm font-medium text-slate-900">{currentUser.name}</span>
          <span className="block text-[11px] text-slate-500">{ROLE_LABEL[currentUser.role]}</span>
        </span>
        <LuChevronDown className="h-4 w-4 text-slate-400" />
      </button>
      {open && (
        <div className="animate-fade-in absolute right-0 z-40 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="truncate text-sm font-medium text-slate-900">{currentUser.name}</p>
            <p className="truncate text-xs text-slate-500">{currentUser.email}</p>
          </div>
          <div className="py-1">
            <button onClick={() => { setOpen(false); setPwOpen(true); }} className={item}>
              <LuKeyRound className="h-4 w-4" /> Change password
            </button>
            {['owner', 'admin'].includes(currentUser.role) && (
              <button onClick={() => { resetDemo(); setOpen(false); navigate('/'); }} className={item}>
                <LuRotateCcw className="h-4 w-4" /> Reset demo data
              </button>
            )}
            <button onClick={() => { setOpen(false); auth.signOut(); navigate('/'); }} className={item}>
              <LuLogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </div>
      )}
      <ChangePasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
    </div>
  );
}

export default function Layout({ children }) {
  const { currentUser } = useStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 bg-navy-900 lg:block">
        <Sidebar />
      </aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setMobileOpen(false)} />
          <aside className="animate-fade-in absolute inset-y-0 left-0 w-64 bg-navy-900 shadow-xl">
            <button onClick={() => setMobileOpen(false)} aria-label="Close menu" className="absolute right-3 top-4 rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white">
              <LuX className="h-5 w-5" />
            </button>
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}
      <div className="lg:pl-64">
        <div className="sticky top-0 z-20">
        <header className="flex h-16 items-center gap-3 border-b border-slate-200 border-t-4 border-t-orange-500 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <button onClick={() => setMobileOpen(true)} aria-label="Open menu" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden">
            <LuMenu className="h-5 w-5" />
          </button>
          <span className="hidden rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 sm:inline">
            Signed in as {currentUser.name} · {ROLE_LABEL[currentUser.role]}
          </span>
          <div className="ml-auto flex items-center gap-1">
            <NotificationBell />
            <UserMenu />
          </div>
        </header>
        </div>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}

