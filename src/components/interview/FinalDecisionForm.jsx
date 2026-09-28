// The Final Decision Maker's form: once every panelist has submitted feedback, AI summarises
// the panel's views and suggests one consolidated recommendation for the Project Owner.
import { useState } from 'react';
import { LuCrown, LuSend, LuSparkles, LuUndo2 } from 'react-icons/lu';
import { useStore, finalFor } from '../../store/store';
import { AIBadge, AIPanel, Button, Card, CardHeader, DecisionBadge, Field, Input, Textarea, useToast } from '../ui';
import { consolidateFeedback } from '../../services/ai';
import DecisionPicker from './DecisionPicker';

export default function FinalDecisionForm({ assignment, project, panelFeedback }) {
  const { db, submitFinalDecision, userById } = useStore();
  const toast = useToast();
  const previous = finalFor(db, assignment.id); // set when the owner returned an earlier decision
  const [summary, setSummary] = useState(null); // AI panel summary
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    decision: previous?.decision || '',
    altRole: previous?.altRole || '',
    summary: previous?.summary || '',
    rationale: previous?.rationale || '',
  });
  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const summarise = async () => {
    setLoading(true);
    const result = await consolidateFeedback(panelFeedback, project.criteria, (id) => userById(id)?.name);
    setSummary(result);
    setForm({
      decision: result.recommendation,
      altRole: panelFeedback.find((fb) => fb.altRole)?.altRole || '',
      summary: result.summary,
      rationale: result.rationale,
    });
    setLoading(false);
  };

  const submit = () => {
    const e = {};
    if (!form.decision) e.decision = 'Choose the consolidated decision';
    if (!form.summary.trim()) e.summary = 'Required';
    if (form.decision === 'Recommend for another role' && !form.altRole.trim()) e.altRole = 'Which role?';
    setErrors(e);
    if (Object.keys(e).length) return;
    submitFinalDecision(assignment.id, { ...form, aiAssisted: !!summary });
    toast('Final decision sent to the Project Owner');
  };

  return (
    <Card className="border-amber-200">
      <CardHeader
        icon={LuCrown}
        title="Final decision"
        subtitle="You are the Final Decision Maker. Review all panel feedback and submit one consolidated recommendation."
      />
      <div className="space-y-5 p-5">
        {previous?.ownerStatus === 'returned' && (
          <div className="flex gap-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
            <LuUndo2 className="mt-0.5 h-4 w-4 shrink-0" />
            <div><p className="font-medium">Returned by the Project Owner</p><p>“{previous.ownerNote}”</p></div>
          </div>
        )}

        <AIPanel
          title="Panel summary"
          actions={<Button size="sm" variant="ai" icon={LuSparkles} loading={loading} onClick={summarise}>{summary ? 'Regenerate' : 'Summarise panel feedback'}</Button>}
        >
          {!summary ? (
            <p className="text-sm text-violet-900/70">
              Gemini reads all {panelFeedback.length} feedback submissions and drafts a consolidated recommendation, highlighting agreements, concerns and disagreements.
            </p>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-slate-600">Weighted score</span>
                <span className="text-lg font-semibold tabular-nums text-slate-900">{summary.weightedScore}/5</span>
                <span className="text-slate-400">·</span>
                <span className="text-slate-600">Suggested</span>
                <DecisionBadge decision={summary.recommendation} />
              </div>
              <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
                {project.criteria.map((c) => (
                  <div key={c.name} className="flex items-center justify-between">
                    <span className="text-slate-600">{c.name}</span>
                    <span className="font-medium tabular-nums">{summary.averages[c.name] ?? '—'}</span>
                  </div>
                ))}
              </div>
              {summary.disagreements.length > 0 && (
                <div className="rounded-lg bg-amber-50 p-2.5 text-amber-900">
                  <p className="font-medium">Points of disagreement</p>
                  <ul className="mt-1 list-disc pl-5">{summary.disagreements.map((d) => <li key={d}>{d}</li>)}</ul>
                </div>
              )}
            </div>
          )}
        </AIPanel>

        <div>
          <div className="mb-2 flex items-center gap-2">
            <p className="text-sm font-medium text-slate-700">Consolidated decision <span className="text-rose-500">*</span></p>
            {summary && <AIBadge>AI suggested</AIBadge>}
          </div>
          <DecisionPicker name={`final-${assignment.id}`} value={form.decision} onChange={(d) => set('decision', d)} />
          {errors.decision && <p className="mt-1 text-xs text-rose-600">{errors.decision}</p>}
          {form.decision === 'Recommend for another role' && (
            <Field label="Recommended role" error={errors.altRole} className="mt-3">
              <Input value={form.altRole} onChange={(e) => set('altRole', e.target.value)} />
            </Field>
          )}
        </div>
        <Field label="Consolidated summary" required error={errors.summary}>
          <Textarea rows={4} value={form.summary} onChange={(e) => set('summary', e.target.value)} placeholder="Summarise the panel's view of the candidate" />
        </Field>
        <Field label="Rationale & next steps">
          <Textarea rows={3} value={form.rationale} onChange={(e) => set('rationale', e.target.value)} />
        </Field>
        <div className="flex justify-end">
          <Button icon={LuSend} onClick={submit}>{previous ? 'Resubmit to owner' : 'Submit to Project Owner'}</Button>
        </div>
      </div>
    </Card>
  );
}
