// "Assign interview" dialog (Project Owner): pick candidate, stage, date, panel and the
// Final Decision Maker. AI ranks interviewers by expertise and suggests a panel.
import { useEffect, useState } from 'react';
import { LuSparkles, LuCrown, LuCheck } from 'react-icons/lu';
import { useStore } from '../store/store';
import { Modal, Button, Field, Input, Select, Textarea, TypeBadge, Avatar, Badge, useToast, cx } from './ui';
import { suggestPanel } from '../services/ai';
import { daysFromNow, toLocalInput } from '../utils';

export default function AssignmentModal({ open, onClose, project, candidateId }) {
  const { db, createAssignment } = useStore();
  const toast = useToast();
  const interviewers = db.users.filter((u) => u.role === 'interviewer');
  const candidates = db.candidates.filter((c) => c.projectId === project.id && !['Rejected', 'Redirected'].includes(c.status));

  const [form, setForm] = useState(null);
  const [ai, setAi] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    const cand = db.candidates.find((c) => c.id === candidateId) || candidates[0];
    const done = new Set(db.assignments.filter((a) => a.candidateId === cand?.id).map((a) => a.stageId));
    const stage = project.stages.find((s) => !done.has(s.id)) || project.stages[0];
    setForm({
      candidateId: cand?.id || '',
      stageId: stage.id,
      schedule: toLocalInput(daysFromNow(1, 10)),
      interviewerIds: [],
      fdmId: '',
      expectations: cand?.gaps?.length ? `Probe gaps flagged by AI: ${cand.gaps.join(', ')}.` : '',
    });
    setAi(null);
    setError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, candidateId]);

  const stage = form && project.stages.find((s) => s.id === form.stageId);

  // Ask AI for a panel whenever the stage type changes
  useEffect(() => {
    if (!open || !stage) return;
    let live = true;
    setAiLoading(true);
    suggestPanel(project, stage.type, interviewers).then((res) => {
      if (live) { setAi(res); setAiLoading(false); }
    });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, stage?.type]);

  if (!open || !form) return null;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggle = (id) => {
    setForm((f) => {
      const ids = f.interviewerIds.includes(id) ? f.interviewerIds.filter((x) => x !== id) : [...f.interviewerIds, id];
      const fdmId = ids.length === 1 ? ids[0] : ids.includes(f.fdmId) ? f.fdmId : '';
      return { ...f, interviewerIds: ids, fdmId };
    });
  };
  const applyAi = () => ai && setForm((f) => ({ ...f, interviewerIds: ai.recommended, fdmId: ai.fdmId }));
  const matchOf = (id) => ai?.ranking.find((r) => r.id === id);
  const sorted = ai ? [...interviewers].sort((a, b) => (matchOf(b.id)?.match || 0) - (matchOf(a.id)?.match || 0)) : interviewers;

  const save = () => {
    if (!form.candidateId) return setError('Choose a candidate');
    if (!form.interviewerIds.length) return setError('Assign at least one interviewer');
    if (!form.fdmId) return setError('Designate one interviewer as the Final Decision Maker');
    if (!form.schedule) return setError('Set the interview date and time');
    createAssignment({
      projectId: project.id,
      candidateId: form.candidateId,
      stageId: stage.id,
      stageName: stage.name,
      type: stage.type,
      interviewerIds: form.interviewerIds,
      fdmId: form.fdmId,
      schedule: new Date(form.schedule).toISOString(),
      expectations: form.expectations,
    });
    toast('Interview assigned. Interviewers have been notified.');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title="Assign interview"
      subtitle={project.role}
      footer={
        <>
          {error && <p className="mr-auto self-center text-sm text-rose-600">{error}</p>}
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Assign & notify</Button>
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-2">
          <Field label="Candidate" required>
            <Select value={form.candidateId} onChange={(e) => set('candidateId', e.target.value)}>
              {candidates.map((c) => <option key={c.id} value={c.id}>{c.name}{c.fitScore != null ? ` (fit ${c.fitScore})` : ''}</option>)}
            </Select>
          </Field>
          <Field label="Interview stage" required>
            <Select value={form.stageId} onChange={(e) => set('stageId', e.target.value)}>
              {project.stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>
          <div className="flex items-center gap-2 text-sm text-slate-500">Interview type <TypeBadge type={stage.type} /></div>
          <Field label="Date & time" required>
            <Input type="datetime-local" value={form.schedule} onChange={(e) => set('schedule', e.target.value)} />
          </Field>
          <Field label="Expectations & instructions" hint="Shown to interviewers in their workspace">
            <Textarea rows={4} value={form.expectations} onChange={(e) => set('expectations', e.target.value)} placeholder="What should this round assess?" />
          </Field>
          <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
            <p className="font-medium text-slate-700">Assessment criteria</p>
            <p className="mt-1">{project.criteria.map((c) => `${c.name} (${c.weight}%)`).join(' · ')}</p>
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-slate-700">Interview panel</p>
            <Button size="sm" variant="aiSoft" icon={LuSparkles} loading={aiLoading} disabled={!ai} onClick={applyAi}>Use AI suggestion</Button>
          </div>
          <ul className="space-y-2">
            {sorted.map((iv) => {
              const m = matchOf(iv.id);
              const selected = form.interviewerIds.includes(iv.id);
              const recommended = ai?.recommended.includes(iv.id);
              return (
                <li key={iv.id}>
                  <div className={cx('flex items-start gap-3 rounded-xl border p-3 transition', selected ? 'border-indigo-300 bg-indigo-50/50' : 'border-slate-200 hover:border-slate-300')}>
                    <button
                      type="button"
                      onClick={() => toggle(iv.id)}
                      aria-pressed={selected}
                      aria-label={`${selected ? 'Remove' : 'Add'} ${iv.name}`}
                      className={cx('mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded border', selected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 bg-white')}
                    >
                      {selected && <LuCheck className="h-3.5 w-3.5" />}
                    </button>
                    <Avatar name={iv.name} size="sm" />
                    <div className="min-w-0 flex-1 cursor-pointer" onClick={() => toggle(iv.id)}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-slate-900">{iv.name}</span>
                        {recommended && <Badge tone="violet" icon={LuSparkles}>Recommended</Badge>}
                      </div>
                      <p className="text-xs text-slate-500">{iv.designation} · {iv.department} · {iv.experience} yrs · {iv.availability}</p>
                      {m && <p className="mt-1 text-xs text-violet-700">{m.reason}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      {m && <span className={cx('text-sm font-semibold tabular-nums', m.match >= 70 ? 'text-emerald-600' : m.match >= 45 ? 'text-amber-600' : 'text-slate-400')}>{m.match}%</span>}
                      {selected && form.interviewerIds.length > 1 && (
                        <button
                          type="button"
                          onClick={() => set('fdmId', iv.id)}
                          className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset', form.fdmId === iv.id ? 'bg-amber-100 text-amber-800 ring-amber-300' : 'text-slate-500 ring-slate-200 hover:bg-slate-50')}
                        >
                          <LuCrown className="h-3 w-3" /> {form.fdmId === iv.id ? 'Final decision maker' : 'Make FDM'}
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          {form.interviewerIds.length > 1 && !form.fdmId && (
            <p className="mt-3 text-sm text-amber-700">Multiple interviewers: choose one Final Decision Maker.</p>
          )}
          {form.interviewerIds.length === 1 && (
            <p className="mt-3 text-sm text-slate-500">With a single interviewer, they are automatically the Final Decision Maker.</p>
          )}
        </div>
      </div>
    </Modal>
  );
}
