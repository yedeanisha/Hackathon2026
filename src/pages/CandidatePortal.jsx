// Candidate home: their applications, interview slots to confirm or move, and AI prep tips.
// Candidates never see feedback, ratings or fit scores.
import { useState } from 'react';
import {
  LuCalendar, LuCircleCheck, LuClock, LuSparkles, LuBriefcase, LuFileText, LuLock, LuSearch, LuCalendarClock,
} from 'react-icons/lu';
import { useStore, applicationsFor, candidateView } from '../store/store';
import { Card, CardHeader, Button, Badge, TypeBadge, PageHeader, Empty, Modal, Field, Textarea, AIPanel, useToast, cx } from '../components/ui';
import { useNavigate } from '../router';
import { generatePrepGuide } from '../services/ai';
import { formatDate, formatDateTime } from '../utils';

const STEPS = ['Applied', 'Under review', 'Interviews', 'Outcome'];

function stepIndex(c, view) {
  if (['Offer', 'Rejected', 'Redirected', 'On hold'].includes(c.status)) return 3;
  if (view.interviews.length) return 2;
  if (c.status === 'New') return 0;
  return 1;
}

function Progress({ current }) {
  return (
    <ol className="flex items-center gap-2">
      {STEPS.map((s, i) => (
        <li key={s} className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className={cx('h-1.5 rounded-full', i <= current ? 'bg-indigo-500' : 'bg-slate-200')} />
          <span className={cx('truncate text-[11px] font-medium', i <= current ? 'text-slate-700' : 'text-slate-400')}>{s}</span>
        </li>
      ))}
    </ol>
  );
}

function UpcomingInterview({ a, project }) {
  const { respondToInterview } = useStore();
  const toast = useToast();
  const [prep, setPrep] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resched, setResched] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const resp = a.candidateResponse;

  const loadPrep = async () => {
    setLoading(true);
    setPrep(await generatePrepGuide(project, a.type));
    setLoading(false);
  };

  const sendReschedule = () => {
    if (!note.trim()) { setError('Tell us which days or times work for you'); return; }
    respondToInterview(a.id, 'reschedule', note.trim());
    setResched(false);
    toast('Request sent. The hiring team will propose a new time.');
  };

  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex flex-wrap items-center gap-2 font-medium text-slate-900">{a.stageName} <TypeBadge type={a.type} /></p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600"><LuCalendar className="h-4 w-4 text-slate-400" /> {formatDateTime(a.schedule)} · video call</p>
        </div>
        {resp?.response === 'confirmed' && <Badge tone="emerald" icon={LuCircleCheck}>You confirmed</Badge>}
        {resp?.response === 'reschedule' && <Badge tone="amber" icon={LuCalendarClock}>Reschedule requested</Badge>}
      </div>

      {resp?.response === 'reschedule' && resp.note && <p className="mt-2 text-sm text-slate-600">Your note: “{resp.note}”</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        {resp?.response !== 'confirmed' && (
          <Button size="sm" variant="success" icon={LuCircleCheck} onClick={() => { respondToInterview(a.id, 'confirmed'); toast('Interview confirmed'); }}>
            Confirm slot
          </Button>
        )}
        {resp?.response !== 'reschedule' && (
          <Button size="sm" variant="secondary" icon={LuCalendarClock} onClick={() => setResched(true)}>Request new time</Button>
        )}
        <Button size="sm" variant="aiSoft" icon={LuSparkles} loading={loading} onClick={loadPrep}>{prep ? 'Refresh prep tips' : 'Prepare with AI'}</Button>
      </div>

      {prep && (
        <AIPanel title="How to prepare" className="mt-4">
          <div className="space-y-3 text-sm text-slate-700">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-medium text-slate-500">Skills this role focuses on:</span>
              {prep.focus.map((s) => <Badge key={s} tone="indigo">{s}</Badge>)}
            </div>
            <ul className="list-disc space-y-1 pl-5">{prep.tips.map((t) => <li key={t}>{t}</li>)}</ul>
            <p className="text-slate-500">{prep.logistics}</p>
          </div>
        </AIPanel>
      )}

      <Modal
        open={resched}
        onClose={() => setResched(false)}
        title="Request a new time"
        subtitle={`${a.stageName} · currently ${formatDateTime(a.schedule)}`}
        footer={<><Button variant="secondary" onClick={() => setResched(false)}>Cancel</Button><Button onClick={sendReschedule}>Send request</Button></>}
      >
        <Field label="Which days or times work for you?" error={error}>
          <Textarea rows={3} value={note} onChange={(e) => { setNote(e.target.value); setError(''); }} placeholder="e.g. Any afternoon next Tuesday or Wednesday" />
        </Field>
      </Modal>
    </div>
  );
}

export default function CandidatePortal() {
  const { db, currentUser } = useStore();
  const navigate = useNavigate();
  const apps = applicationsFor(db, currentUser).sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
  const latest = apps[0];

  return (
    <div>
      <PageHeader
        title={`Hi ${currentUser.name.split(' ')[0]}`}
        subtitle="Track your applications and upcoming interviews."
        actions={<Button variant="secondary" icon={LuSearch} onClick={() => navigate('/jobs')}>Browse open roles</Button>}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          {apps.length === 0 && (
            <Card><Empty icon={LuBriefcase} title="No applications yet" text="Find a role that fits you and apply with your resume." action={<Button onClick={() => navigate('/jobs')}>Browse open roles</Button>} /></Card>
          )}
          {apps.map((c) => {
            const project = db.projects.find((p) => p.id === c.projectId);
            const view = candidateView(db, c);
            const past = view.interviews.filter((a) => new Date(a.schedule) <= new Date());
            return (
              <Card key={c.id}>
                <CardHeader
                  icon={LuBriefcase}
                  title={project.role}
                  subtitle={`${project.designation} · ${project.department} · applied ${formatDate(c.addedAt)}`}
                  actions={<Badge tone={view.tone}>{view.label}</Badge>}
                />
                <div className="space-y-5 p-5">
                  <Progress current={stepIndex(c, view)} />
                  <p className="text-sm text-slate-600">{view.text}</p>

                  {view.upcoming.map((a) => <UpcomingInterview key={a.id} a={a} project={project} />)}

                  {past.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Completed interviews</p>
                      <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                        {past.map((a) => (
                          <li key={a.id} className="flex flex-wrap items-center gap-2 px-3 py-2.5 text-sm">
                            <LuCircleCheck className="h-4 w-4 text-emerald-500" />
                            <span className="font-medium text-slate-800">{a.stageName}</span>
                            <TypeBadge type={a.type} />
                            <span className="ml-auto text-slate-500">{formatDateTime(a.schedule)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        <div className="min-w-0 space-y-6">
          {latest && (
            <Card>
              <CardHeader title="Your profile" subtitle="Extracted from your resume" icon={LuFileText} />
              <div className="space-y-4 p-5 text-sm">
                <p className="text-slate-700">{latest.currentRole} · {latest.experience} years experience</p>
                <div className="flex flex-wrap gap-1.5">{latest.skills.map((s) => <Badge key={s}>{s}</Badge>)}</div>
                {latest.resumeName && <p className="flex items-center gap-2 text-slate-500"><LuFileText className="h-4 w-4" /> {latest.resumeName}</p>}
              </div>
            </Card>
          )}
          <Card className="p-5">
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-900"><LuClock className="h-4 w-4 text-slate-400" /> What happens next</p>
            <p className="mt-2 text-sm text-slate-600">After each interview the panel reviews your application and the hiring manager makes a decision. You'll get a notification here as soon as there's an update.</p>
          </Card>
          <Card className="p-5">
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-900"><LuLock className="h-4 w-4 text-slate-400" /> Your privacy</p>
            <p className="mt-2 text-sm text-slate-600">Interview notes and scores are confidential to the hiring team. You'll see your status and outcomes here.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
