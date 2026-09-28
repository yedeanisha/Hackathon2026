// The interviewer's evaluation for one interview: ratings per criterion, strengths,
// concerns, details and a recommendation. AI can pre-fill it from the meeting transcript
// or from the interviewer's rough notes; the interviewer always reviews before submitting.
import { useState } from 'react';
import { LuListChecks, LuSend, LuTriangleAlert, LuWandSparkles } from 'react-icons/lu';
import { useStore } from '../../store/store';
import { AIBadge, AIPanel, Button, Card, CardHeader, DecisionBadge, Field, Input, Modal, RatingInput, Textarea, useToast } from '../ui';
import { polishFeedback } from '../../services/ai';
import DecisionPicker from './DecisionPicker';
import TranscriptAssistant from './TranscriptAssistant';

const EMPTY_FEEDBACK = { ratings: {}, strengths: '', concerns: '', details: '', decision: '', altRole: '' };

export default function FeedbackForm({ assignment, project, candidate }) {
  const { submitFeedback, currentUser } = useStore();
  const toast = useToast();
  const [feedback, setFeedback] = useState(EMPTY_FEEDBACK);
  const [aiUsed, setAiUsed] = useState(false);
  const [notes, setNotes] = useState('');
  const [notesLoading, setNotesLoading] = useState(false);
  const [biasFlags, setBiasFlags] = useState([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [errors, setErrors] = useState({});
  const set = (field, value) => setFeedback((f) => ({ ...f, [field]: value }));

  // Copies an AI draft into the form (from the transcript or from rough notes).
  const applyDraft = (draft) => {
    setFeedback((f) => ({ ...f, ratings: draft.ratings, strengths: draft.strengths, concerns: draft.concerns, details: draft.details, decision: draft.decision }));
    setAiUsed(true);
  };

  const draftFromNotes = async () => {
    if (notes.trim().length < 20) { setErrors({ notes: 'Write a few sentences of notes first' }); return; }
    setErrors({});
    setNotesLoading(true);
    const draft = await polishFeedback(notes, project.criteria);
    applyDraft(draft);
    setBiasFlags(draft.biasFlags);
    setNotesLoading(false);
    toast('AI structured your notes. Review every field before submitting.');
  };

  const validate = () => {
    const e = {};
    if (project.criteria.some((c) => !feedback.ratings[c.name])) e.ratings = 'Rate every criterion';
    if (!feedback.strengths.trim()) e.strengths = 'Required';
    if (!feedback.concerns.trim()) e.concerns = 'Required (write "None" if there are none)';
    if (!feedback.decision) e.decision = 'Choose a decision';
    if (feedback.decision === 'Recommend for another role' && !feedback.altRole.trim()) e.altRole = 'Which role?';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = () => {
    submitFeedback(assignment.id, { ...feedback, aiAssisted: aiUsed });
    setConfirmOpen(false);
    toast('Feedback submitted');
  };

  return (
    <Card>
      <CardHeader title="Your evaluation" subtitle="Structured feedback for this round. It can't be edited after you submit." icon={LuListChecks} />
      <div className="space-y-6 p-5">
        <TranscriptAssistant project={project} candidate={candidate} interviewerName={currentUser.name} onUse={applyDraft} />

        <AIPanel title="Draft from your rough notes">
          <Textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Strong system design, explained trade-offs clearly. Struggled with SQL indexing. Good collaboration, asked thoughtful questions…"
            className="bg-white"
          />
          {errors.notes && <p className="mt-1 text-xs text-rose-600">{errors.notes}</p>}
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-violet-700/80">AI fills in the form and flags wording that could introduce bias.</p>
            <Button size="sm" variant="ai" icon={LuWandSparkles} loading={notesLoading} onClick={draftFromNotes}>Structure with AI</Button>
          </div>
        </AIPanel>

        {biasFlags.length > 0 && (
          <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <LuTriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">Possible bias detected in your notes</p>
              <p className="mt-0.5">
                References to {biasFlags.join(', ')} should not influence hiring decisions. Those sentences were left out of the draft; focus on job-related evidence.
              </p>
            </div>
          </div>
        )}

        <div>
          <div className="mb-2 flex items-center gap-2">
            <p className="text-sm font-medium text-slate-700">Ratings</p>
            {aiUsed && <AIBadge />}
          </div>
          <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {project.criteria.map((c) => (
              <div key={c.name} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                <span className="text-sm text-slate-700">{c.name} <span className="text-xs text-slate-400">· {c.weight}%</span></span>
                <RatingInput value={feedback.ratings[c.name] || 0} onChange={(v) => set('ratings', { ...feedback.ratings, [c.name]: v })} />
              </div>
            ))}
          </div>
          {errors.ratings && <p className="mt-1 text-xs text-rose-600">{errors.ratings}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Strengths" required error={errors.strengths}>
            <Textarea id="feedback-strengths" rows={4} value={feedback.strengths} onChange={(e) => set('strengths', e.target.value)} placeholder="Specific evidence of what went well" />
          </Field>
          <Field label="Concerns" required error={errors.concerns}>
            <Textarea id="feedback-concerns" rows={4} value={feedback.concerns} onChange={(e) => set('concerns', e.target.value)} placeholder="Gaps or risks observed" />
          </Field>
        </div>
        <Field label="Detailed feedback">
          <Textarea id="feedback-details" rows={5} value={feedback.details} onChange={(e) => set('details', e.target.value)} placeholder="Questions asked, how the candidate answered, anything the panel should know" />
        </Field>

        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Your recommendation <span className="text-rose-500">*</span></p>
          <DecisionPicker name={`decision-${assignment.id}`} value={feedback.decision} onChange={(d) => set('decision', d)} />
          {errors.decision && <p className="mt-1 text-xs text-rose-600">{errors.decision}</p>}
          {feedback.decision === 'Recommend for another role' && (
            <Field label="Suggested role" error={errors.altRole} className="mt-3">
              <Input value={feedback.altRole} onChange={(e) => set('altRole', e.target.value)} placeholder="e.g. Full-stack Engineer" />
            </Field>
          )}
        </div>

        <div className="flex justify-end">
          <Button icon={LuSend} onClick={() => validate() && setConfirmOpen(true)}>Submit feedback</Button>
        </div>
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Submit feedback?"
        footer={<><Button variant="secondary" onClick={() => setConfirmOpen(false)}>Keep editing</Button><Button onClick={submit}>Submit</Button></>}
      >
        <p className="text-sm text-slate-600">
          Your recommendation is <DecisionBadge decision={feedback.decision} />. Once submitted, your feedback is locked and recorded in the audit log.
          The Final Decision Maker will be notified when all panel feedback is in.
        </p>
      </Modal>
    </Card>
  );
}
