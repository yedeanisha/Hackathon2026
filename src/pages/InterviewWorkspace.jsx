// One interview: the candidate, the role, the panel, and the feedback / decision steps.
// Who sees what:
//   - Interview panel: resume, role, suggested questions, their own feedback form.
//   - Final Decision Maker: also everyone's feedback (after submitting their own) and the final decision form.
//   - Project Owner: everything, plus the consolidated decision for approval.
//   - HR Admin: status only; resumes and feedback are hidden.
import {
  LuArrowLeft, LuCalendar, LuCircleCheck, LuClock, LuCrown, LuEyeOff, LuFileText, LuLock, LuSparkles, LuTarget, LuTriangleAlert,
} from 'react-icons/lu';
import { useStore, assignmentStatus, feedbackFor, finalFor, pendingInterviewerIds, isOverdue } from '../store/store';
import { Avatar, Badge, Button, Card, CardHeader, CandidateResponseBadge, DecisionBadge, Empty, StatusBadge, TypeBadge } from '../components/ui';
import { ResumeView } from '../components/CandidateProfileModal';
import DecisionReviewCard, { FeedbackCard } from '../components/DecisionReviewCard';
import FeedbackForm from '../components/interview/FeedbackForm';
import FinalDecisionForm from '../components/interview/FinalDecisionForm';
import SuggestedQuestions from '../components/interview/SuggestedQuestions';
import { Link } from '../router';
import { formatDateTime } from '../utils';

const goHome = <Link to="/"><Button variant="secondary">Go home</Button></Link>;

export default function InterviewWorkspace({ id }) {
  const { db, currentUser, userById } = useStore();

  const interview = db.assignments.find((a) => a.id === id);
  if (!interview) return <Empty title="Interview not found" action={goHome} />;
  const project = db.projects.find((p) => p.id === interview.projectId);
  const candidate = db.candidates.find((c) => c.id === interview.candidateId);

  const me = currentUser.id;
  const isPanel = interview.interviewerIds.includes(me);
  const isFdm = interview.fdmId === me;
  const isOwner = currentUser.role === 'owner' && project.ownerId === me;
  const isAdmin = currentUser.role === 'admin';
  if (!isPanel && !isOwner && !isAdmin) {
    return <Empty icon={LuLock} title="Access restricted" text="Only the assigned interview panel and the project owner can open this interview." action={goHome} />;
  }
  const canSeeCandidate = isPanel || isOwner;

  const allFeedback = feedbackFor(db, interview.id);
  const myFeedback = allFeedback.find((f) => f.interviewerId === me);
  const finalDecision = finalFor(db, interview.id);
  const status = assignmentStatus(db, interview);
  const stillPending = pendingInterviewerIds(db, interview);
  const hasPanel = interview.interviewerIds.length > 1;
  // The FDM sees other panelists' feedback only after submitting their own, to avoid being anchored by it.
  const canSeeAllFeedback = isOwner || (isFdm && !!myFeedback);
  const visibleFeedback = canSeeAllFeedback ? allFeedback : myFeedback ? [myFeedback] : [];

  return (
    <div>
      {/* ---------- Header ---------- */}
      <div className="mb-6">
        <Link to={isOwner ? `/projects/${project.id}?tab=interviews` : '/'} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
          <LuArrowLeft className="h-4 w-4" /> {isOwner ? project.role : isAdmin ? 'Back' : 'My interviews'}
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <Avatar name={candidate.name} size="lg" />
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{candidate.name}</h1>
              <p className="text-sm text-slate-500">{project.role} · {project.designation}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge tone="slate">{interview.stageName}</Badge>
                <TypeBadge type={interview.type} />
                <span className="flex items-center gap-1 text-xs text-slate-500"><LuCalendar className="h-3.5 w-3.5" /> {formatDateTime(interview.schedule)}</span>
                {isFdm && hasPanel && <Badge tone="amber" icon={LuCrown}>You are the Final Decision Maker</Badge>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isOverdue(db, interview) && <Badge tone="rose" icon={LuTriangleAlert}>Overdue</Badge>}
            {status === 'Scheduled' && <CandidateResponseBadge response={interview.candidateResponse} />}
            <StatusBadge status={status} />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* ---------- Left column: candidate and role ---------- */}
        <div className="space-y-6 lg:col-span-5">
          {canSeeCandidate ? (
            <Card>
              <CardHeader title="Candidate resume" icon={LuFileText} actions={candidate.fitScore != null && <Badge tone="violet" icon={LuSparkles}>Fit {candidate.fitScore}</Badge>} />
              <div className="p-5">
                <ResumeView candidate={candidate} requiredSkills={project.requiredSkills} />
                {candidate.gaps?.length > 0 && (
                  <div className="mt-4 flex flex-wrap items-center gap-1.5 rounded-lg bg-amber-50 p-3">
                    <span className="text-xs font-medium text-amber-900">AI suggests probing:</span>
                    {candidate.gaps.map((g) => <Badge key={g} tone="amber">{g}</Badge>)}
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <Card><Empty icon={LuEyeOff} title="Resume restricted" text="HR admins can see interview status, but resumes and feedback are limited to the panel and the project owner." /></Card>
          )}

          <Card>
            <CardHeader title="Role & expectations" icon={LuTarget} />
            <div className="space-y-4 p-5 text-sm">
              {interview.expectations && (
                <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-3 text-indigo-900">
                  <p className="font-medium">Instructions for this round</p>
                  <p className="mt-1">{interview.expectations}</p>
                </div>
              )}
              <p className="text-slate-700">{project.description}</p>
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Required skills</p>
                <div className="flex flex-wrap gap-1.5">{project.requiredSkills.map((s) => <Badge key={s} tone="indigo">{s}</Badge>)}</div>
              </div>
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Assessment criteria</p>
                <ul className="space-y-1">
                  {project.criteria.map((c) => (
                    <li key={c.name} className="flex justify-between text-slate-700"><span>{c.name}</span><span className="tabular-nums text-slate-400">{c.weight}%</span></li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>

          {isPanel && <SuggestedQuestions assignment={interview} project={project} candidate={candidate} />}
        </div>

        {/* ---------- Right column: panel, feedback and decision ---------- */}
        <div className="space-y-6 lg:col-span-7">
          <Card>
            <CardHeader title="Panel" subtitle={`${allFeedback.length} of ${interview.interviewerIds.length} feedback submitted`} />
            <ul className="divide-y divide-slate-100">
              {interview.interviewerIds.map((interviewerId) => {
                const person = userById(interviewerId);
                const submitted = allFeedback.some((f) => f.interviewerId === interviewerId);
                return (
                  <li key={interviewerId} className="flex items-center gap-3 px-5 py-3">
                    <Avatar name={person?.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900">{person?.name}{interviewerId === me && <span className="font-normal text-slate-400"> (you)</span>}</p>
                      <p className="text-xs text-slate-500">{person?.designation}</p>
                    </div>
                    {interviewerId === interview.fdmId && hasPanel && <Badge tone="amber" icon={LuCrown}>FDM</Badge>}
                    {submitted ? <Badge tone="emerald" icon={LuCircleCheck}>Submitted</Badge> : <Badge tone="amber" icon={LuClock}>Pending</Badge>}
                  </li>
                );
              })}
            </ul>
          </Card>

          {isPanel && !myFeedback && <FeedbackForm assignment={interview} project={project} candidate={candidate} />}

          {canSeeCandidate && visibleFeedback.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-slate-900">{canSeeAllFeedback ? 'Panel feedback' : 'Your submitted feedback'}</h2>
                {!canSeeAllFeedback && hasPanel && (
                  <span className="flex items-center gap-1 text-xs text-slate-500"><LuLock className="h-3.5 w-3.5" /> Other panelists' feedback is visible only to the FDM and owner</span>
                )}
              </div>
              {visibleFeedback.map((fb) => <FeedbackCard key={fb.id} fb={fb} criteria={project.criteria} isFdm={hasPanel && fb.interviewerId === interview.fdmId} />)}
            </div>
          )}

          {isFdm && myFeedback && stillPending.length > 0 && (
            <Card className="border-amber-200 bg-amber-50/40 p-5">
              <p className="flex items-center gap-2 font-medium text-amber-900"><LuCrown className="h-4 w-4" /> Final decision</p>
              <p className="mt-1 text-sm text-amber-900/80">
                Waiting for feedback from {stillPending.map((p) => userById(p)?.name).join(', ')}. You'll be notified when everyone has submitted.
              </p>
            </Card>
          )}

          {isFdm && stillPending.length === 0 && (!finalDecision || finalDecision.ownerStatus === 'returned') && (
            <FinalDecisionForm key={finalDecision?.reviewedAt || 'new'} assignment={interview} project={project} panelFeedback={allFeedback} />
          )}

          {finalDecision && finalDecision.ownerStatus !== 'returned' && (isOwner || isPanel) && (
            <div>
              <h2 className="mb-3 font-semibold text-slate-900">Consolidated decision</h2>
              <DecisionReviewCard assignment={interview} />
            </div>
          )}

          {isAdmin && (
            <Card className="p-5 text-sm text-slate-600">
              <p className="flex items-center gap-2 font-medium text-slate-900"><LuLock className="h-4 w-4" /> Restricted view</p>
              <p className="mt-1">
                Feedback content is only visible to the interview panel and the project owner. Status: <StatusBadge status={status} />
                {finalDecision && <> · Decision: <DecisionBadge decision={finalDecision.decision} /></>}
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
