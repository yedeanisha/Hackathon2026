// "Add candidate" dialog (Project Owner): upload a resume, AI extracts the details
// and scores fit against the role; the owner checks them before saving.
import { useRef, useState } from 'react';
import { LuUpload, LuSparkles, LuFileText, LuCircleCheck, LuLoaderCircle, LuPencil } from 'react-icons/lu';
import { useStore } from '../store/store';
import { Modal, Button, Field, Input, TagInput, FitScore, AIPanel, Badge, Textarea, useToast, cx } from './ui';
import { parseResume, scoreFit } from '../services/ai';

const STEPS = ['Uploading to Cloud Storage', 'Extracting text with Gemini', 'Matching against required skills', 'Scoring fit'];

export default function CandidateUploadModal({ open, onClose, project }) {
  const { addCandidate } = useStore();
  const toast = useToast();
  const inputRef = useRef(null);
  const [stage, setStage] = useState('pick'); // pick | parsing | review
  const [step, setStep] = useState(0);
  const [file, setFile] = useState(null);
  const [data, setData] = useState(null);
  const [aiParsed, setAiParsed] = useState(false);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState('');

  const reset = () => { setStage('pick'); setStep(0); setFile(null); setData(null); setAiParsed(false); setError(''); };
  const close = () => { reset(); onClose(); };

  const handleFile = async (f) => {
    if (!f) return;
    if (!/\.(pdf|docx?|txt)$/i.test(f.name)) { setError('Please upload a PDF, Word or text file.'); return; }
    if (f.size > 10 * 1024 * 1024) { setError('File is larger than 10 MB.'); return; }
    setError('');
    setFile(f);
    setStage('parsing');
    setStep(0);
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 400);
    try {
      const parsed = await parseResume(f, project);
      setData(parsed);
      setAiParsed(true);
      setStage('review');
    } catch (e) {
      setError(e.message);
      setStage('pick');
    } finally {
      clearInterval(timer);
    }
  };

  const manual = () => {
    setData({ name: '', email: '', phone: '', location: '', currentRole: '', experience: 0, education: '', skills: [], summary: '', highlights: [], fitScore: null, fitReason: '', gaps: [] });
    setAiParsed(false);
    setStage('review');
  };

  const set = (k, v) => setData((d) => {
    const next = { ...d, [k]: v };
    if (k === 'skills' || k === 'experience') Object.assign(next, scoreFit(next.skills, project.requiredSkills, Number(next.experience) || 0));
    return next;
  });

  const save = () => {
    if (!data.name.trim()) { setError('Candidate name is required'); return; }
    if (!data.email.trim() && !data.phone.trim()) { setError('Add an email or phone number'); return; }
    const fit = data.fitScore == null ? scoreFit(data.skills, project.requiredSkills, Number(data.experience) || 0) : {};
    addCandidate(project.id, { ...data, ...fit, experience: Number(data.experience) || 0, status: 'Screening' }, file);
    toast(`${data.name} added to ${project.role}`);
    close();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      size="lg"
      title="Add candidate"
      subtitle={`${project.role} · required: ${project.requiredSkills.join(', ')}`}
      footer={stage === 'review' && (
        <>
          <Button variant="secondary" onClick={reset}>Back</Button>
          <Button onClick={save}>Add candidate</Button>
        </>
      )}
    >
      {stage === 'pick' && (
        <div>
          <div
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files?.[0]); }}
            onClick={() => inputRef.current?.click()}
            className={cx('flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition', drag ? 'border-indigo-400 bg-indigo-50' : 'border-slate-300 hover:border-indigo-300 hover:bg-slate-50')}
          >
            <span className="mb-3 rounded-full bg-indigo-50 p-3 text-indigo-600"><LuUpload className="h-6 w-6" /></span>
            <p className="font-medium text-slate-900">Drop a resume here, or click to browse</p>
            <p className="mt-1 text-sm text-slate-500">PDF or Word, up to 10 MB</p>
            <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-violet-700"><LuSparkles className="h-3.5 w-3.5" /> Gemini extracts the candidate's details and scores their fit</p>
            <input ref={inputRef} type="file" accept=".pdf,.doc,.docx,.txt" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
          </div>
          {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
          <button onClick={manual} className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900">
            <LuPencil className="h-4 w-4" /> Enter details manually instead
          </button>
        </div>
      )}

      {stage === 'parsing' && (
        <div className="py-6">
          <div className="mb-6 flex items-center gap-3 rounded-lg bg-slate-50 p-3">
            <LuFileText className="h-5 w-5 text-slate-400" />
            <span className="truncate text-sm font-medium">{file?.name}</span>
          </div>
          <ul className="space-y-3">
            {STEPS.map((s, i) => (
              <li key={s} className="flex items-center gap-3 text-sm">
                {i < step ? <LuCircleCheck className="h-5 w-5 text-emerald-500" /> : i === step ? <LuLoaderCircle className="h-5 w-5 animate-spin text-violet-600" /> : <span className="h-5 w-5 rounded-full border-2 border-slate-200" />}
                <span className={i <= step ? 'text-slate-900' : 'text-slate-400'}>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {stage === 'review' && data && (
        <div className="space-y-5">
          {aiParsed && (
            <AIPanel title="Extracted by AI — please verify" actions={<Badge tone="violet">{file?.name}</Badge>}>
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <p className="text-xs text-slate-500">Fit score</p>
                  <FitScore score={data.fitScore} />
                </div>
                <p className="min-w-0 flex-1 text-sm text-slate-700">{data.fitReason}</p>
              </div>
            </AIPanel>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" required><Input value={data.name} onChange={(e) => set('name', e.target.value)} /></Field>
            <Field label="Current role"><Input value={data.currentRole} onChange={(e) => set('currentRole', e.target.value)} /></Field>
            <Field label="Email"><Input type="email" value={data.email} onChange={(e) => set('email', e.target.value)} /></Field>
            <Field label="Phone"><Input value={data.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
            <Field label="Location"><Input value={data.location} onChange={(e) => set('location', e.target.value)} /></Field>
            <Field label="Years of experience"><Input type="number" min="0" value={data.experience} onChange={(e) => set('experience', e.target.value)} /></Field>
          </div>
          <Field label="Skills" hint="Fit score updates as you edit skills">
            <TagInput value={data.skills} onChange={(v) => set('skills', v)} />
          </Field>
          <Field label="Summary">
            <Textarea rows={2} value={data.summary} onChange={(e) => set('summary', e.target.value)} />
          </Field>
          {!aiParsed && data.fitScore != null && (
            <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3 text-sm">
              <span className="text-slate-500">Fit score</span> <FitScore score={data.fitScore} />
            </div>
          )}
          {error && <p className="text-sm text-rose-600">{error}</p>}
        </div>
      )}
    </Modal>
  );
}
