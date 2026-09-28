// Owner / Admin: list of interviewers, register a new one, and change the email they sign in with.
import { useState } from 'react';
import { LuUserPlus, LuSearch, LuPencil, LuMail } from 'react-icons/lu';
import { useStore, assignmentStatus, emailConflict } from '../store/store';
import { useAuth } from '../auth/AuthProvider';
import { passwordProblem } from '../auth/password';
import { Card, Button, Modal, Field, Input, TagInput, Badge, PageHeader, Avatar, useToast } from '../components/ui';

const BLANK = { name: '', email: '', password: '', designation: '', department: '', expertise: [], experience: '', availability: '' };

export default function Interviewers() {
  const { db, registerInterviewer, changeUserEmail } = useStore();
  const auth = useAuth();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [errors, setErrors] = useState({});
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(null); // interviewer whose sign-in email is being changed
  const [newEmail, setNewEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  const openEmail = (u) => { setEditing(u); setNewEmail(u.email); setEmailError(''); };
  const saveEmail = () => {
    const e = newEmail.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(e)) { setEmailError('Enter a valid email'); return; }
    if (e === editing.email.toLowerCase()) { setEditing(null); return; }
    const err = emailConflict(db, editing.id, e);
    if (err) { setEmailError(err); return; }
    changeUserEmail(editing.id, e);
    if (auth.mode === 'firebase') auth.invite(e, 'interviewer').catch(() => {});
    toast(`${editing.name} now signs in with ${e}`);
    setEditing(null);
  };
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const interviewers = db.users
    .filter((u) => u.role === 'interviewer')
    .filter((u) => !q || `${u.name} ${u.designation} ${u.department} ${(u.expertise || []).join(' ')}`.toLowerCase().includes(q.toLowerCase()));

  const save = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Required';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Enter a valid email';
    else if (db.users.some((u) => u.email.toLowerCase() === form.email.trim().toLowerCase())) e.email = 'An account with this email already exists';
    if (auth.mode === 'local') { const pw = passwordProblem(form.password); if (pw) e.password = pw; }
    if (!form.designation.trim()) e.designation = 'Required';
    if (!form.department.trim()) e.department = 'Required';
    if (!form.expertise.length) e.expertise = 'Add at least one area';
    setErrors(e);
    if (Object.keys(e).length) return;
    const email = form.email.trim().toLowerCase();
    const { password, ...profile } = form;
    if (auth.mode === 'local') {
      registerInterviewer({ ...profile, email, experience: Number(form.experience) || 0, passwordHash: auth.staffPasswordHash(email, password) });
      toast(`${form.name} can now sign in as an interviewer`);
    } else {
      registerInterviewer({ ...profile, email, experience: Number(form.experience) || 0 });
      auth.invite(email, 'interviewer').catch(() => toast('Could not save the sign-in invite. Check Firestore rules.', 'error'));
      toast(`Invite created: ${form.name} gets the interviewer role when they sign up with ${email}`);
    }
    setForm(BLANK);
    setOpen(false);
  };

  return (
    <div>
      <PageHeader
        title="Interviewers"
        subtitle="Registered interviewers, their expertise and availability. AI uses this to suggest interview panels."
        actions={<Button icon={LuUserPlus} onClick={() => setOpen(true)}>Register interviewer</Button>}
      />
      <Card>
        <div className="border-b border-slate-100 p-4">
          <div className="relative max-w-sm">
            <LuSearch className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input className="pl-9" placeholder="Search by name, department or expertise" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Interviewer</th>
                <th className="px-5 py-3">Department</th>
                <th className="px-5 py-3">Expertise</th>
                <th className="px-5 py-3">Experience</th>
                <th className="px-5 py-3">Availability</th>
                <th className="px-5 py-3">Active load</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {interviewers.map((u) => {
                const load = db.assignments.filter((a) => a.interviewerIds.includes(u.id) && assignmentStatus(db, a) !== 'Completed').length;
                return (
                  <tr key={u.id}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.name} size="sm" />
                        <div>
                          <p className="font-medium text-slate-900">{u.name}</p>
                          <p className="text-xs text-slate-500">{u.designation}</p>
                          <button
                            type="button"
                            onClick={() => openEmail(u)}
                            className="mt-0.5 inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800"
                            title="Change sign-in email"
                          >
                            <LuMail className="h-3 w-3" /> {u.email} <LuPencil className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{u.department}</td>
                    <td className="px-5 py-3"><div className="flex max-w-xs flex-wrap gap-1">{(u.expertise || []).map((e) => <Badge key={e}>{e}</Badge>)}</div></td>
                    <td className="whitespace-nowrap px-5 py-3 text-slate-600">{u.experience} yrs</td>
                    <td className="px-5 py-3 text-slate-600">{u.availability || '—'}</td>
                    <td className="px-5 py-3"><Badge tone={load >= 3 ? 'amber' : 'slate'}>{load} interview{load === 1 ? '' : 's'}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {interviewers.length === 0 && <p className="px-5 py-8 text-center text-sm text-slate-500">No interviewers match your search.</p>}
        </div>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Register interviewer"
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>Register</Button></>}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" required error={errors.name}><Input value={form.name} onChange={(e) => set('name', e.target.value)} /></Field>
          <Field label="Work email" required error={errors.email} hint={auth.mode === 'firebase' ? 'They sign up with this email and get the interviewer role.' : 'Used to sign in.'}><Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} /></Field>
          {auth.mode === 'local' && (
            <Field label="Temporary password" required error={errors.password} hint="Share it with them securely. They can change it after signing in." className="sm:col-span-2">
              <Input id="new-interviewer-password" type="text" autoComplete="new-password" value={form.password} onChange={(e) => set('password', e.target.value)} />
            </Field>
          )}
          <Field label="Designation" required error={errors.designation}><Input value={form.designation} onChange={(e) => set('designation', e.target.value)} placeholder="e.g. Engineering Manager" /></Field>
          <Field label="Department" required error={errors.department}><Input value={form.department} onChange={(e) => set('department', e.target.value)} /></Field>
          <Field label="Years of experience"><Input type="number" min="0" value={form.experience} onChange={(e) => set('experience', e.target.value)} /></Field>
          <Field label="Availability"><Input value={form.availability} onChange={(e) => set('availability', e.target.value)} placeholder="e.g. Mon–Wed, 10:00–16:00" /></Field>
          <Field label="Expertise" required error={errors.expertise} className="sm:col-span-2">
            <TagInput value={form.expertise} onChange={(v) => set('expertise', v)} placeholder="e.g. Java, System Design, Behavioural" />
          </Field>
        </div>
      </Modal>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Change sign-in email"
        subtitle={editing ? `${editing.name} · ${editing.designation}` : ''}
        footer={<><Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={saveEmail}>Save</Button></>}
      >
        <Field
          label="Sign-in email"
          error={emailError}
          hint="Must match the email this person signs in with exactly. Their interviews follow this email."
        >
          <Input id="interviewer-email" type="email" value={newEmail} onChange={(e) => { setNewEmail(e.target.value); setEmailError(''); }} />
        </Field>
        {auth.mode === 'firebase' && (
          <p className="mt-3 text-xs text-slate-500">If they haven't created their login yet, they get the Interviewer role automatically when they sign up with this email.</p>
        )}
      </Modal>
    </div>
  );
}
