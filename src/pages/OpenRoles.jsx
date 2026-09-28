// Candidate: browse open roles and apply with a resume (AI fills in their details).
import { useRef, useState } from 'react';
import { LuUpload, LuSparkles, LuCircleCheck, LuLoaderCircle, LuFileText, LuBriefcase } from 'react-icons/lu';
import { useStore, applicationsFor } from '../store/store';
import { Card, Button, Badge, TypeBadge, PageHeader, Empty, Modal, Field, Input, TagInput, AIPanel, useToast, cx } from '../components/ui';
import { useNavigate } from '../router';
import { parseResume } from '../services/ai';

function ApplyModal({ project, onClose }) {
  const { applyToProject } = useStore();
  const toast = useToast();
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handle = async (f) => {
    if (!f) return;
    if (!/\.(pdf|docx?|txt)$/i.test(f.name)) { setError('Please upload a PDF, Word or text file.'); return; }
    setError('');
    setFile(f);
    setLoading(true);
    const parsed = await parseResume(f, project);
    setData(parsed);
    setLoading(false);
  };

  const submit = () => {
    applyToProject(project.id, { ...data, experience: Number(data.experience) || 0 }, file);
    toast(`Application sent for ${project.role}`);
    onClose();
    navigate('/');
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={`Apply for ${project.role}`}
      subtitle={`${project.designation} · ${project.department}`}
      footer={data && <><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={submit}>Submit application</Button></>}
    >
      {!file && (
        <div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 px-6 py-10 text-center transition hover:border-indigo-300 hover:bg-slate-50"
          >
            <span className="mb-3 rounded-full bg-indigo-50 p-3 text-indigo-600"><LuUpload className="h-6 w-6" /></span>
            <span className="font-medium text-slate-900">Upload your resume</span>
            <span className="mt-1 text-sm text-slate-500">PDF or Word, up to 10 MB</span>
            <span className="mt-3 flex items-center gap-1.5 text-xs font-medium text-violet-700"><LuSparkles className="h-3.5 w-3.5" /> We'll fill in your details automatically</span>
          </button>
          <input ref={inputRef} type="file" accept=".pdf,.doc,.docx,.txt" className="hidden" onChange={(e) => handle(e.target.files?.[0])} />
          {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
        </div>
      )}
      {loading && (
        <div className="flex items-center gap-3 py-8 text-sm text-slate-600">
          <LuLoaderCircle className="h-5 w-5 animate-spin text-violet-600" /> Reading {file?.name}…
        </div>
      )}
      {data && !loading && (
        <div className="space-y-4">
          <AIPanel title="Please check your details">
            <p className="flex items-center gap-2 text-sm text-slate-600"><LuFileText className="h-4 w-4" /> {file.name}</p>
          </AIPanel>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Current role"><Input value={data.currentRole} onChange={(e) => setData({ ...data, currentRole: e.target.value })} /></Field>
            <Field label="Years of experience"><Input type="number" min="0" value={data.experience} onChange={(e) => setData({ ...data, experience: e.target.value })} /></Field>
            <Field label="Phone"><Input value={data.phone} onChange={(e) => setData({ ...data, phone: e.target.value })} /></Field>
            <Field label="Location"><Input value={data.location} onChange={(e) => setData({ ...data, location: e.target.value })} /></Field>
          </div>
          <Field label="Skills"><TagInput value={data.skills} onChange={(v) => setData({ ...data, skills: v })} /></Field>
        </div>
      )}
    </Modal>
  );
}

export default function OpenRoles() {
  const { db, currentUser } = useStore();
  const [applying, setApplying] = useState(null);
  const applied = new Set(applicationsFor(db, currentUser).map((c) => c.projectId));
  const roles = db.projects.filter((p) => p.status === 'Active');

  return (
    <div>
      <PageHeader title="Open roles" subtitle="Apply with your resume. You can track every application from your dashboard." />
      {roles.length === 0 ? (
        <Card><Empty icon={LuBriefcase} title="No open roles right now" /></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {roles.map((p) => {
            const done = applied.has(p.id);
            return (
              <Card key={p.id} className="flex flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-900">{p.role}</h3>
                    <p className="text-sm text-slate-500">{p.designation} · {p.department}</p>
                  </div>
                  {done && <Badge tone="emerald" icon={LuCircleCheck}>Applied</Badge>}
                </div>
                <p className="mt-3 text-sm text-slate-600">{p.description}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">{p.requiredSkills.map((s) => <Badge key={s} tone="indigo">{s}</Badge>)}</div>
                <div className="mt-4 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                  Interview process: {p.stages.map((s) => <TypeBadge key={s.id} type={s.type} />)}
                </div>
                <div className={cx('mt-5 flex justify-end border-t border-slate-100 pt-4')}>
                  {done ? <span className="text-sm text-slate-500">You've applied to this role</span> : <Button onClick={() => setApplying(p)}>Apply</Button>}
                </div>
              </Card>
            );
          })}
        </div>
      )}
      {applying && <ApplyModal project={applying} onClose={() => setApplying(null)} />}
    </div>
  );
}
