// A submitted feedback card, and the card the Project Owner uses to approve or
// return a Final Decision Maker's consolidated decision.
import { useState } from 'react';
import { LuChevronDown, LuCrown, LuSparkles, LuCircleCheck, LuUndo2 } from 'react-icons/lu';
import { useStore, feedbackFor, finalFor } from '../store/store';
import { Card, Button, DecisionBadge, TypeBadge, Avatar, RatingInput, Textarea, Badge, useToast, cx } from './ui';
import { Link } from '../router';
import { formatDateTime, timeAgo } from '../utils';

/** Read-only view of one interviewer's submitted feedback. */
export function FeedbackCard({ fb, criteria, isFdm }) {
  const { userById } = useStore();
  const iv = userById(fb.interviewerId);
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Avatar name={iv?.name} size="sm" />
          <div className="leading-tight">
            <p className="text-sm font-medium text-slate-900">{iv?.name} {isFdm && <LuCrown className="ml-0.5 inline h-3.5 w-3.5 text-amber-500" />}</p>
            <p className="text-xs text-slate-500">{iv?.designation} · submitted {timeAgo(fb.submittedAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {fb.aiAssisted && <Badge tone="violet" icon={LuSparkles}>AI-assisted</Badge>}
          <DecisionBadge decision={fb.decision} />
        </div>
      </div>
      {fb.decision === 'Recommend for another role' && fb.altRole && (
        <p className="mt-2 text-sm text-sky-700">Suggested role: <span className="font-medium">{fb.altRole}</span></p>
      )}
      <div className="mt-3 grid gap-x-6 gap-y-1 sm:grid-cols-2">
        {criteria.map((c) => (
          <div key={c.name} className="flex items-center justify-between gap-2 text-sm">
            <span className="text-slate-600">{c.name}</span>
            <RatingInput value={fb.ratings?.[c.name] || 0} readOnly size="sm" />
          </div>
        ))}
      </div>
      <dl className="mt-3 space-y-2 text-sm">
        <div><dt className="font-medium text-emerald-700">Strengths</dt><dd className="text-slate-700">{fb.strengths}</dd></div>
        <div><dt className="font-medium text-rose-700">Concerns</dt><dd className="text-slate-700">{fb.concerns}</dd></div>
        {fb.details && <div><dt className="font-medium text-slate-700">Details</dt><dd className="text-slate-600">{fb.details}</dd></div>}
      </dl>
    </div>
  );
}

/** Owner review of a consolidated final decision. */
export default function DecisionReviewCard({ assignment }) {
  const { db, userById, currentUser, reviewDecision } = useStore();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState('');
  const fin = finalFor(db, assignment.id);
  const c = db.candidates.find((x) => x.id === assignment.candidateId);
  const p = db.projects.find((x) => x.id === assignment.projectId);
  const fbs = feedbackFor(db, assignment.id);
  const fdm = userById(fin.fdmId);
  const canReview = currentUser.role === 'owner' && p.ownerId === currentUser.id && fin.ownerStatus === 'pending';

  const act = (approve) => {
    if (!approve && !note.trim()) { setNoteError('Add a note so the FDM knows what to revisit'); return; }
    reviewDecision(assignment.id, approve, note.trim());
    toast(approve ? `Approved: ${c.name} – ${fin.decision}` : 'Returned to the Final Decision Maker');
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-4 p-5">
        <div className="flex items-start gap-3">
          <Avatar name={c?.name} />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Link to={`/interviews/${assignment.id}`} className="font-semibold text-slate-900 hover:text-indigo-700">{c?.name}</Link>
              <TypeBadge type={assignment.type} />
            </div>
            <p className="text-sm text-slate-500">{p?.role} · {assignment.stageName}</p>
            <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
              <LuCrown className="h-3.5 w-3.5 text-amber-500" /> {fdm?.name} submitted {formatDateTime(fin.submittedAt)}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <DecisionBadge decision={fin.decision} />
          {fin.aiAssisted && <Badge tone="violet" icon={LuSparkles}>AI-assisted summary</Badge>}
        </div>
      </div>

      <div className="space-y-3 px-5 pb-5">
        {fin.decision === 'Recommend for another role' && fin.altRole && (
          <p className="text-sm text-sky-700">Recommended for: <span className="font-medium">{fin.altRole}</span></p>
        )}
        <div className="rounded-lg bg-slate-50 p-3 text-sm">
          <p className="font-medium text-slate-700">Consolidated summary</p>
          <p className="mt-1 text-slate-600">{fin.summary}</p>
          {fin.rationale && (
            <>
              <p className="mt-3 font-medium text-slate-700">Rationale</p>
              <p className="mt-1 text-slate-600">{fin.rationale}</p>
            </>
          )}
        </div>

        <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-800">
          <LuChevronDown className={cx('h-4 w-4 transition', open && 'rotate-180')} /> {open ? 'Hide' : 'Show'} panel feedback ({fbs.length})
        </button>
        {open && (
          <div className="space-y-3">
            {fbs.map((fb) => <FeedbackCard key={fb.id} fb={fb} criteria={p.criteria} isFdm={fb.interviewerId === assignment.fdmId} />)}
          </div>
        )}
      </div>

      {canReview ? (
        <div className="border-t border-slate-100 bg-slate-50 p-5">
          <Textarea
            rows={2}
            value={note}
            onChange={(e) => { setNote(e.target.value); setNoteError(''); }}
            placeholder="Note to the panel (required if returning)"
          />
          {noteError && <p className="mt-1 text-xs text-rose-600">{noteError}</p>}
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <Button variant="secondary" icon={LuUndo2} onClick={() => act(false)}>Return to FDM</Button>
            <Button variant="success" icon={LuCircleCheck} onClick={() => act(true)}>Approve decision</Button>
          </div>
        </div>
      ) : fin.ownerStatus !== 'pending' ? (
        <div className={cx('border-t px-5 py-3 text-sm', fin.ownerStatus === 'approved' ? 'border-emerald-100 bg-emerald-50 text-emerald-800' : 'border-rose-100 bg-rose-50 text-rose-800')}>
          <span className="font-medium">{fin.ownerStatus === 'approved' ? 'Approved' : 'Returned'} by owner</span> {fin.reviewedAt && `· ${formatDateTime(fin.reviewedAt)}`}
          {fin.ownerNote && <span className="block text-slate-600">“{fin.ownerNote}”</span>}
        </div>
      ) : (
        <div className="border-t border-indigo-100 bg-indigo-50 px-5 py-3 text-sm text-indigo-800">Awaiting owner approval</div>
      )}
    </Card>
  );
}
