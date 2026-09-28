// App state store. For the hackathon demo it lives in the browser (with localStorage
// persistence). Each action maps 1:1 to a planned backend endpoint (see comments),
// so swapping to the Cloud Run API later means replacing the body of each action.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { buildSeed } from '../data/seed';
import { DAY, uid } from '../utils';

const STORAGE_KEY = 'hireflow-demo-v5';
const StoreCtx = createContext(null);

// Uploaded resume files (object URLs) are kept in memory only, never persisted.
export const resumeFiles = new Map();

function loadInitial() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* storage unavailable: fall back to seed */
  }
  return buildSeed();
}

const nowIso = () => new Date().toISOString();

// ---------- pure selectors ----------
export function feedbackFor(db, assignmentId) {
  return db.feedback.filter((f) => f.assignmentId === assignmentId);
}
export function finalFor(db, assignmentId) {
  return db.finalDecisions.find((f) => f.assignmentId === assignmentId);
}
export function assignmentStatus(db, a) {
  const fin = finalFor(db, a.id);
  if (fin) {
    if (fin.ownerStatus === 'approved') return 'Completed';
    if (fin.ownerStatus === 'returned') return 'Returned to FDM';
    return 'Owner review';
  }
  const submitted = feedbackFor(db, a.id).length;
  if (submitted >= a.interviewerIds.length) return 'Awaiting final decision';
  if (submitted > 0) return 'Feedback in progress';
  return new Date(a.schedule) > new Date() ? 'Scheduled' : 'Feedback pending';
}
export function pendingInterviewerIds(db, a) {
  const done = new Set(feedbackFor(db, a.id).map((f) => f.interviewerId));
  return a.interviewerIds.filter((id) => !done.has(id));
}
/** Error message if another account with real data already uses this email, otherwise ''. */
export function emailConflict(db, userId, email) {
  const e = email.trim().toLowerCase();
  const other = db.users.find((u) => u.id !== userId && u.email.toLowerCase() === e);
  if (!other) return '';
  const hasWork = db.assignments.some((a) => a.interviewerIds.includes(other.id))
    || db.projects.some((p) => p.ownerId === other.id)
    || db.candidates.some((c) => c.email.toLowerCase() === e)
    || other.id === db.currentUserId;
  return hasWork ? `${other.name} already uses ${e}.` : '';
}

export function isOverdue(db, a) {
  const s = assignmentStatus(db, a);
  return (s === 'Feedback pending' || s === 'Feedback in progress') && Date.now() - new Date(a.schedule).getTime() > DAY;
}

// ---------- helpers that return a new db ----------
function withAudit(db, action, detail, actorId = db.currentUserId) {
  return { ...db, audit: [{ id: uid('l'), at: nowIso(), actorId, action, detail }, ...db.audit] };
}
function withNotify(db, userIds, text, link, type = 'info') {
  const items = [...new Set(userIds)].map((userId) => ({ id: uid('n'), userId, type, text, link, read: false, at: nowIso() }));
  return { ...db, notifications: [...items, ...db.notifications] };
}
const label = (db, a) => {
  const c = db.candidates.find((x) => x.id === a.candidateId);
  return `${c?.name ?? 'Candidate'} – ${a.stageName}`;
};
const nameOf = (db, id) => db.users.find((u) => u.id === id)?.name ?? 'Unknown';

/** The signed-in candidate account linked to a candidate record (matched by email). */
function candidateUserId(db, candidateId) {
  const c = db.candidates.find((x) => x.id === candidateId);
  return db.users.find((u) => u.role === 'candidate' && c && u.email.toLowerCase() === c.email.toLowerCase())?.id;
}

/** Candidate records belonging to a candidate account. */
export function applicationsFor(db, user) {
  return db.candidates.filter((c) => c.email.toLowerCase() === user.email.toLowerCase());
}

/**
 * What a candidate is allowed to see about their own application.
 * Never exposes feedback, ratings, fit scores or undecided outcomes.
 */
export function candidateView(db, c) {
  const interviews = db.assignments
    .filter((a) => a.candidateId === c.id)
    .sort((a, b) => new Date(a.schedule) - new Date(b.schedule));
  const upcoming = interviews.filter((a) => new Date(a.schedule) > new Date());
  const map = {
    Offer: ['Offer extended', 'emerald', 'Congratulations! The hiring team will contact you with the details.'],
    Rejected: ['Not selected', 'slate', 'Thank you for your time. We will not be moving forward with this application.'],
    Redirected: ['Referred to another role', 'sky', 'The hiring team has referred you to another opening that better matches your profile.'],
    'On hold': ['On hold', 'amber', 'Your application is paused for now. We will be in touch if anything changes.'],
  };
  if (map[c.status]) return { label: map[c.status][0], tone: map[c.status][1], text: map[c.status][2], interviews, upcoming };
  if (upcoming.length) return { label: 'Interview scheduled', tone: 'indigo', text: 'Please confirm your interview slot below.', interviews, upcoming };
  const approvedProceed = interviews.some((a) => {
    const f = finalFor(db, a.id);
    return f?.ownerStatus === 'approved' && f.decision === 'Proceed';
  });
  if (approvedProceed) return { label: 'Moved to next round', tone: 'emerald', text: 'You have progressed. We will schedule your next interview soon.', interviews, upcoming };
  if (interviews.length) return { label: 'Interview completed', tone: 'violet', text: 'The hiring team is reviewing your interview. We will update you here.', interviews, upcoming };
  return { label: 'Under review', tone: 'sky', text: 'We have received your application and are reviewing it.', interviews, upcoming };
}

export function StoreProvider({ children }) {
  const [db, setDb] = useState(loadInitial);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch {
      /* ignore */
    }
  }, [db]);

  const currentUser = db.users.find((u) => u.id === db.currentUserId) || null;
  const userById = useCallback((id) => db.users.find((u) => u.id === id), [db.users]);

  const actions = useMemo(() => ({
    // POST /api/auth (Firebase Auth in production)
    login(userId) {
      setDb((d) => withAudit({ ...d, currentUserId: userId }, 'Signed in', nameOf(d, userId), userId));
    },
    // POST /api/accounts  (built-in accounts; Firebase Authentication replaces this when configured)
    createAccount(user) {
      setDb((d) => withAudit({ ...d, users: [...d.users, user] }, 'Account created', `${user.name} (${user.role})`, user.id));
    },
    setPasswordHash(userId, passwordHash) {
      setDb((d) => withAudit(
        { ...d, users: d.users.map((u) => (u.id === userId ? { ...u, passwordHash } : u)) },
        'Password changed',
        nameOf(d, userId),
        userId
      ));
    },

    // Called after Firebase sign-in. The Firestore profile's role is authoritative;
    // the account is matched to existing app data by email.
    signInWithProfile(profile) {
      setDb((d) => {
        const email = profile.email.toLowerCase();
        const existing = d.users.find((u) => u.email.toLowerCase() === email);
        const titles = { owner: 'Project Owner', interviewer: 'Interviewer', admin: 'HR Admin', candidate: 'Candidate' };
        const users = existing
          ? d.users.map((u) => (u.id === existing.id ? { ...u, role: profile.role } : u))
          : [...d.users, { id: profile.uid, role: profile.role, name: profile.name, email, title: titles[profile.role] }];
        const id = existing?.id ?? profile.uid;
        if (d.currentUserId === id) return { ...d, users };
        return withAudit({ ...d, users, currentUserId: id }, 'Signed in', `${profile.name} (${titles[profile.role]})`, id);
      });
    },
    logout() {
      setDb((d) => (d.currentUserId ? { ...d, currentUserId: null } : d));
    },
    resetDemo() {
      resumeFiles.clear();
      setDb((d) => ({ ...buildSeed(), currentUserId: d.currentUserId }));
    },

    // POST /api/projects
    createProject(data) {
      const id = uid('p');
      setDb((d) => {
        const project = { id, ownerId: d.currentUserId, status: 'Active', createdAt: nowIso(), ...data };
        return withAudit({ ...d, projects: [project, ...d.projects] }, 'Project created', `${data.role} (${data.designation})`);
      });
      return id;
    },

    // POST /api/projects/:id/candidates  (resume goes to Cloud Storage)
    addCandidate(projectId, data, file) {
      const id = uid('c');
      if (file) resumeFiles.set(id, URL.createObjectURL(file));
      setDb((d) => {
        const project = d.projects.find((p) => p.id === projectId);
        const cand = { id, projectId, status: 'New', addedAt: nowIso(), resumeName: file?.name, ...data };
        return withAudit(
          { ...d, candidates: [cand, ...d.candidates] },
          'Candidate added',
          `${data.name} → ${project?.role}${data.fitScore != null ? ` (AI fit ${data.fitScore})` : ''}`
        );
      });
      return id;
    },

    // PATCH /api/candidates/:id
    updateCandidateStatus(candidateId, status) {
      setDb((d) => {
        const c = d.candidates.find((x) => x.id === candidateId);
        return withAudit(
          { ...d, candidates: d.candidates.map((x) => (x.id === candidateId ? { ...x, status } : x)) },
          'Candidate status changed',
          `${c?.name}: ${c?.status} → ${status}`
        );
      });
    },

    // PATCH /api/interviewers/:id/email
    // Links an interviewer profile to the email they sign in with. If a bare account with that
    // email was auto-created at sign-in (no interviews on it), it is merged into this profile.
    // Check emailConflict() first.
    changeUserEmail(userId, email) {
      const e = email.trim().toLowerCase();
      setDb((d) => {
        if (emailConflict(d, userId, e)) return d;
        const user = d.users.find((u) => u.id === userId);
        const other = d.users.find((u) => u.id !== userId && u.email.toLowerCase() === e);
        const users = d.users
          .filter((u) => u.id !== other?.id)
          // Keep the merged account's password (built-in sign-in hashes it with this email).
          .map((u) => (u.id === userId ? { ...u, email: e, ...(other?.passwordHash ? { passwordHash: other.passwordHash } : {}) } : u));
        return withAudit({ ...d, users }, 'Sign-in email changed', `${user.name}: ${user.email} → ${e}`);
      });
    },

    // POST /api/interviewers
    registerInterviewer(data) {
      const id = uid('u');
      setDb((d) => withAudit(
        { ...d, users: [...d.users, { id, role: 'interviewer', title: data.designation, ...data }] },
        'Interviewer registered',
        `${data.name} (${data.designation}, ${data.department})`
      ));
      return id;
    },

    // POST /api/assignments
    createAssignment(data) {
      const id = uid('a');
      setDb((d) => {
        const a = { id, createdAt: nowIso(), createdBy: d.currentUserId, ...data };
        const c = d.candidates.find((x) => x.id === a.candidateId);
        let n = {
          ...d,
          assignments: [a, ...d.assignments],
          candidates: d.candidates.map((x) => (x.id === a.candidateId && ['New', 'Screening'].includes(x.status) ? { ...x, status: 'Interviewing' } : x)),
        };
        n = withNotify(n, a.interviewerIds, `New interview assigned: ${c?.name} – ${a.stageName}.`, `/interviews/${id}`, 'assignment');
        if (a.interviewerIds.length > 1) {
          n = withNotify(n, [a.fdmId], `You are the Final Decision Maker for ${c?.name} – ${a.stageName}.`, `/interviews/${id}`, 'assignment');
        }
        const cu = candidateUserId(d, a.candidateId);
        if (cu) {
          const role = d.projects.find((p) => p.id === a.projectId)?.role;
          const when = new Date(a.schedule).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
          n = withNotify(n, [cu], `Your ${a.stageName} for ${role} is scheduled for ${when}. Please confirm the slot.`, '/', 'assignment');
        }
        return withAudit(
          n,
          'Interview assigned',
          `${label(d, a)} → ${a.interviewerIds.map((i) => nameOf(d, i)).join(', ')} (FDM: ${nameOf(d, a.fdmId)})`
        );
      });
      return id;
    },

    // POST /api/assignments/:id/feedback
    submitFeedback(assignmentId, data) {
      setDb((d) => {
        const a = d.assignments.find((x) => x.id === assignmentId);
        if (!a || feedbackFor(d, assignmentId).some((f) => f.interviewerId === d.currentUserId)) return d;
        const fb = { id: uid('f'), assignmentId, interviewerId: d.currentUserId, submittedAt: nowIso(), ...data };
        let n = { ...d, feedback: [...d.feedback, fb] };
        const project = d.projects.find((p) => p.id === a.projectId);
        n = withNotify(n, [project.ownerId], `${nameOf(d, d.currentUserId)} submitted feedback for ${label(d, a)}.`, `/interviews/${a.id}`, 'completion');
        if (pendingInterviewerIds(n, a).length === 0) {
          n = withNotify(n, [a.fdmId], `All feedback received for ${label(d, a)}. Please submit the final decision.`, `/interviews/${a.id}`, 'action');
        }
        return withAudit(n, 'Feedback submitted', `${label(d, a)}: ${data.decision}`);
      });
    },

    // POST /api/assignments/:id/final-decision
    submitFinalDecision(assignmentId, data) {
      setDb((d) => {
        const a = d.assignments.find((x) => x.id === assignmentId);
        const project = d.projects.find((p) => p.id === a.projectId);
        const fin = { assignmentId, fdmId: d.currentUserId, submittedAt: nowIso(), ownerStatus: 'pending', ...data };
        let n = { ...d, finalDecisions: [...d.finalDecisions.filter((f) => f.assignmentId !== assignmentId), fin] };
        n = withNotify(n, [project.ownerId], `Final decision submitted for ${label(d, a)} (${data.decision}). Awaiting your approval.`, '/approvals', 'approval');
        return withAudit(n, 'Final decision submitted', `${label(d, a)}: ${data.decision}${data.aiAssisted ? ' (AI-assisted)' : ''}`);
      });
    },

    // POST /api/assignments/:id/review
    reviewDecision(assignmentId, approve, note) {
      setDb((d) => {
        const a = d.assignments.find((x) => x.id === assignmentId);
        const fin = finalFor(d, assignmentId);
        const statusMap = { Proceed: 'Interviewing', Hold: 'On hold', Reject: 'Rejected', 'Recommend for another role': 'Redirected' };
        let n = {
          ...d,
          finalDecisions: d.finalDecisions.map((f) =>
            f.assignmentId === assignmentId ? { ...f, ownerStatus: approve ? 'approved' : 'returned', ownerNote: note, reviewedAt: nowIso() } : f
          ),
          candidates: approve
            ? d.candidates.map((c) => (c.id === a.candidateId ? { ...c, status: statusMap[fin.decision] ?? c.status } : c))
            : d.candidates,
        };
        n = withNotify(
          n,
          approve ? a.interviewerIds : [a.fdmId],
          approve
            ? `Decision approved for ${label(d, a)}: ${fin.decision}.`
            : `Decision for ${label(d, a)} was returned by the owner${note ? `: "${note}"` : ''}.`,
          `/interviews/${a.id}`,
          approve ? 'completion' : 'action'
        );
        const cu = candidateUserId(d, a.candidateId);
        if (approve && cu) {
          const role = d.projects.find((p) => p.id === a.projectId)?.role;
          const msg = {
            Proceed: `Good news: you have moved forward in the ${role} process.`,
            Hold: `Your ${role} application is on hold for now. We will be in touch.`,
            Reject: `Thank you for interviewing for ${role}. We will not be moving forward this time.`,
            'Recommend for another role': `The ${role} team has referred you to our ${fin.altRole || 'other'} opening.`,
          }[fin.decision];
          n = withNotify(n, [cu], msg, '/', 'completion');
        }
        return withAudit(n, approve ? 'Decision approved' : 'Decision returned', `${label(d, a)}${note ? ` – ${note}` : ''}`);
      });
    },

    // POST /api/assignments/:id/candidate-response   (candidate confirms or asks to reschedule)
    respondToInterview(assignmentId, response, note = '') {
      setDb((d) => {
        const a = d.assignments.find((x) => x.id === assignmentId);
        const project = d.projects.find((p) => p.id === a.projectId);
        let n = {
          ...d,
          assignments: d.assignments.map((x) => (x.id === assignmentId ? { ...x, candidateResponse: { response, note, at: nowIso() } } : x)),
        };
        n = withNotify(
          n,
          response === 'reschedule' ? [project.ownerId, ...a.interviewerIds] : [project.ownerId],
          response === 'reschedule'
            ? `${label(d, a)}: candidate asked to reschedule${note ? ` ("${note}")` : ''}.`
            : `${label(d, a)}: candidate confirmed the interview slot.`,
          `/interviews/${a.id}`,
          response === 'reschedule' ? 'escalation' : 'completion'
        );
        return withAudit(n, response === 'reschedule' ? 'Reschedule requested' : 'Interview confirmed', `${label(d, a)}${note ? ` – ${note}` : ''}`);
      });
    },

    // POST /api/projects/:id/applications   (candidate self-applies; resume parsed by AI)
    applyToProject(projectId, data, file) {
      const id = uid('c');
      if (file) resumeFiles.set(id, URL.createObjectURL(file));
      setDb((d) => {
        const me = d.users.find((u) => u.id === d.currentUserId);
        const project = d.projects.find((p) => p.id === projectId);
        const cand = { id, projectId, status: 'New', addedAt: nowIso(), resumeName: file?.name, ...data, name: me.name, email: me.email, source: 'Self-applied' };
        let n = { ...d, candidates: [cand, ...d.candidates] };
        n = withNotify(n, [project.ownerId], `New application from ${me.name} for ${project.role}${data.fitScore != null ? ` (AI fit ${data.fitScore})` : ''}.`, `/projects/${projectId}`, 'assignment');
        return withAudit(n, 'Application received', `${me.name} → ${project.role}`);
      });
      return id;
    },

    // POST /api/reminders  (Cloud Scheduler can call the same endpoint later)
    sendReminders() {
      setDb((d) => {
        let n = d;
        let count = 0;
        const escalate = [];
        for (const a of d.assignments) {
          const pending = pendingInterviewerIds(d, a);
          const status = assignmentStatus(d, a);
          if ((status === 'Feedback pending' || status === 'Feedback in progress') && new Date(a.schedule) < new Date()) {
            n = withNotify(n, pending, `Reminder: feedback for ${label(d, a)} is ${isOverdue(d, a) ? 'overdue' : 'due'}.`, `/interviews/${a.id}`, 'reminder');
            count += pending.length;
            if (isOverdue(d, a)) escalate.push(a);
          }
          if (status === 'Awaiting final decision' || status === 'Returned to FDM') {
            n = withNotify(n, [a.fdmId], `Reminder: final decision pending for ${label(d, a)}.`, `/interviews/${a.id}`, 'reminder');
            count += 1;
          }
        }
        for (const a of escalate) {
          n = withNotify(n, [a.fdmId], `Escalation: ${label(d, a)} feedback is more than 24h overdue.`, `/interviews/${a.id}`, 'escalation');
        }
        return withAudit(n, 'Reminders sent', `${count} reminder(s), ${escalate.length} escalation(s)`);
      });
    },

    markRead(notificationId) {
      setDb((d) => ({ ...d, notifications: d.notifications.map((n) => (n.id === notificationId ? { ...n, read: true } : n)) }));
    },
    markAllRead() {
      setDb((d) => ({ ...d, notifications: d.notifications.map((n) => (n.userId === d.currentUserId ? { ...n, read: true } : n)) }));
    },
  }), []);

  const value = { db, currentUser, userById, ...actions };
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export const useStore = () => useContext(StoreCtx);
