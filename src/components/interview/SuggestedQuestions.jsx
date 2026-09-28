// AI-generated interview questions for one candidate, based on the role,
// the interview type and the gaps in their resume. Shown to the interview panel only.
import { useState } from 'react';
import { LuSparkles } from 'react-icons/lu';
import { Badge, Button, Card, CardHeader, useToast } from '../ui';
import { generateQuestions } from '../../services/ai';

export default function SuggestedQuestions({ assignment, project, candidate }) {
  const toast = useToast();
  const [questions, setQuestions] = useState(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      setQuestions(await generateQuestions(project, candidate, assignment.type));
    } catch (e) {
      toast(e.message, 'error');
    }
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader
        title="Suggested questions"
        icon={LuSparkles}
        subtitle={`Tailored to this candidate for a ${assignment.type === 'hr' ? 'HR' : assignment.type} interview`}
        actions={<Button size="sm" variant="aiSoft" icon={LuSparkles} loading={loading} onClick={generate}>{questions ? 'Regenerate' : 'Generate'}</Button>}
      />
      <div className="p-5">
        {!questions ? (
          <p className="text-sm text-slate-500">Generate an interview kit based on the role, the interview type and gaps in this candidate's resume.</p>
        ) : (
          <ol className="space-y-3">
            {questions.map((q, i) => (
              <li key={q.q} className="flex gap-3 text-sm">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[11px] font-semibold text-violet-700">{i + 1}</span>
                <span>
                  <span className="text-slate-800">{q.q}</span>
                  <span className="mt-1 block"><Badge tone={q.focus.startsWith('Gap') ? 'amber' : 'slate'}>{q.focus}</Badge></span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </Card>
  );
}
