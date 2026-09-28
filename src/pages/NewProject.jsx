// Project Owner: create an interview project. AI can draft the description, skills, stages and criteria.
import { useState } from 'react';
import { LuSparkles, LuPlus, LuTrash2, LuArrowLeft } from 'react-icons/lu';
import { useStore } from '../store/store';
import { Card, CardHeader, Button, Field, Input, Textarea, Select, TagInput, PageHeader, AIBadge, useToast } from '../components/ui';
import { useNavigate, Link } from '../router';
import { generateProjectDraft } from '../services/ai';
import { INTERVIEW_TYPES } from '../data/seed';
import { uid } from '../utils';

const EMPTY = {
  role: '', designation: '', department: '', description: '', responsibilities: '',
  requiredSkills: [], stages: [{ id: uid('s'), name: 'Technical round', type: 'technical' }],
  criteria: [{ name: 'Technical depth', weight: 40 }, { name: 'Problem solving', weight: 30 }, { name: 'Communication', weight: 30 }],
};

export default function NewProject() {
  const { createProject, currentUser } = useStore();
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState({ ...EMPTY, department: currentUser.department || '' });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiFilled, setAiFilled] = useState(false);
  const [errors, setErrors] = useState({});
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const totalWeight = form.criteria.reduce((s, c) => s + Number(c.weight || 0), 0);

  const runAI = async () => {
    if (!form.role.trim()) { setErrors({ role: 'Enter a job role first so AI knows what to draft.' }); return; }
    setAiLoading(true);
    try {
      const d = await generateProjectDraft(form);
      setForm((f) => ({ ...f, ...d, stages: d.stages.map((s) => ({ ...s, id: uid('s') })) }));
      setAiFilled(true);
      toast('AI drafted the project. Review and edit before saving.');
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setAiLoading(false);
    }
  };

  const save = (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.role.trim()) errs.role = 'Job role is required';
    if (!form.designation.trim()) errs.designation = 'Designation is required';
    if (!form.requiredSkills.length) errs.skills = 'Add at least one skill';
    if (!form.stages.length || form.stages.some((s) => !s.name.trim())) errs.stages = 'Every stage needs a name';
    if (totalWeight !== 100) errs.criteria = `Weights must add up to 100 (currently ${totalWeight})`;
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const id = createProject({ ...form, criteria: form.criteria.map((c) => ({ ...c, weight: Number(c.weight) })) });
    toast('Project created');
    navigate(`/projects/${id}`);
  };

  return (
    <form onSubmit={save} className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow={<Link to="/projects" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"><LuArrowLeft className="h-4 w-4" /> Projects</Link>}
        title="New interview project"
        subtitle="Start with the role. AI can draft the rest for you to review."
      />

      <Card>
        <CardHeader title="Role" subtitle="What are you hiring for?" />
        <div className="grid gap-4 p-5 sm:grid-cols-3">
          <Field label="Job role" required error={errors.role}>
            <Input value={form.role} onChange={(e) => set('role', e.target.value)} placeholder="e.g. Backend Engineer" />
          </Field>
          <Field label="Designation" required error={errors.designation}>
            <Input value={form.designation} onChange={(e) => set('designation', e.target.value)} placeholder="e.g. Senior Software Engineer (L3)" />
          </Field>
          <Field label="Department">
            <Input value={form.department} onChange={(e) => set('department', e.target.value)} placeholder="e.g. Engineering" />
          </Field>
        </div>
        <div className="mx-5 mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-violet-200 bg-violet-50 p-4">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-violet-800"><LuSparkles className="h-4 w-4" /> Draft with AI</p>
            <p className="text-sm text-violet-700/80">Generates the job description, skills, interview stages and evaluation criteria.</p>
          </div>
          <Button variant="ai" icon={LuSparkles} loading={aiLoading} onClick={runAI}>{aiFilled ? 'Regenerate' : 'Generate'}</Button>
        </div>
      </Card>

      <Card className="mt-6">
        <CardHeader title="Job details" actions={aiFilled && <AIBadge />} />
        <div className="space-y-4 p-5">
          <Field label="Job description">
            <Textarea rows={4} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="What the role is about" />
          </Field>
          <Field label="Assigned responsibilities" hint="One per line">
            <Textarea rows={4} value={form.responsibilities} onChange={(e) => set('responsibilities', e.target.value)} />
          </Field>
          <Field label="Required skills" required error={errors.skills} hint="Used by AI to score candidate fit and match interviewers">
            <TagInput value={form.requiredSkills} onChange={(v) => set('requiredSkills', v)} placeholder="Type a skill and press Enter" />
          </Field>
        </div>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Interview stages"
            subtitle="In order"
            actions={<Button size="sm" variant="secondary" icon={LuPlus} onClick={() => set('stages', [...form.stages, { id: uid('s'), name: '', type: 'behavioural' }])}>Add</Button>}
          />
          <div className="space-y-2 p-5">
            {form.stages.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2">
                <span className="w-5 text-center text-sm font-medium tabular-nums text-slate-400">{i + 1}</span>
                <Input value={s.name} placeholder="Stage name" onChange={(e) => set('stages', form.stages.map((x) => (x.id === s.id ? { ...x, name: e.target.value } : x)))} />
                <Select className="w-40" value={s.type} onChange={(e) => set('stages', form.stages.map((x) => (x.id === s.id ? { ...x, type: e.target.value } : x)))}>
                  {INTERVIEW_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </Select>
                <Button size="sm" variant="ghost" aria-label="Remove stage" icon={LuTrash2} disabled={form.stages.length === 1} onClick={() => set('stages', form.stages.filter((x) => x.id !== s.id))} />
              </div>
            ))}
            {errors.stages && <p className="text-xs text-rose-600">{errors.stages}</p>}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Evaluation criteria"
            subtitle={<span className={totalWeight === 100 ? '' : 'text-rose-600'}>Weights total {totalWeight}%</span>}
            actions={<Button size="sm" variant="secondary" icon={LuPlus} onClick={() => set('criteria', [...form.criteria, { name: '', weight: 0 }])}>Add</Button>}
          />
          <div className="space-y-2 p-5">
            {form.criteria.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input value={c.name} placeholder="Criterion" onChange={(e) => set('criteria', form.criteria.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                <div className="relative w-24 shrink-0">
                  <Input type="number" min="0" max="100" value={c.weight} className="pr-7" onChange={(e) => set('criteria', form.criteria.map((x, j) => (j === i ? { ...x, weight: e.target.value } : x)))} />
                  <span className="pointer-events-none absolute right-3 top-2 text-sm text-slate-400">%</span>
                </div>
                <Button size="sm" variant="ghost" aria-label="Remove criterion" icon={LuTrash2} disabled={form.criteria.length === 1} onClick={() => set('criteria', form.criteria.filter((_, j) => j !== i))} />
              </div>
            ))}
            {errors.criteria && <p className="text-xs text-rose-600">{errors.criteria}</p>}
          </div>
        </Card>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={() => navigate('/projects')}>Cancel</Button>
        <Button type="submit">Create project</Button>
      </div>
    </form>
  );
}
