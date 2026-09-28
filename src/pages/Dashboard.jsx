// Owner / Admin home: headline numbers, interviews waiting on someone, upcoming interviews.
import { LuFolderKanban, LuUsers, LuClock, LuGavel, LuSend, LuTriangleAlert, LuChevronRight, LuPlus, LuSparkles, LuCircleCheck } from 'react-icons/lu';
import { useStore, assignmentStatus, isOverdue, pendingInterviewerIds } from '../store/store';
import { Card, CardHeader, Stat, Button, StatusBadge, TypeBadge, Badge, Empty, PageHeader, Avatar, useToast } from '../components/ui';
import { Link, useNavigate } from '../router';
import { formatDateTime, timeAgo } from '../utils';

export default function Dashboard() {
  const { db, currentUser, userById, sendReminders } = useStore();
  const navigate = useNavigate();
  const toast = useToast();
  const isOwner = currentUser.role === 'owner';

  const projects = isOwner ? db.projects.filter((p) => p.ownerId === currentUser.id) : db.projects;
  const projectIds = new Set(projects.map((p) => p.id));
  const assignments = db.assignments.filter((a) => projectIds.has(a.projectId));
  const candidates = db.candidates.filter((c) => projectIds.has(c.projectId));

  const withStatus = assignments.map((a) => ({ a, status: assignmentStatus(db, a), overdue: isOverdue(db, a) }));
  const awaitingFeedback = withStatus.filter((x) => ['Feedback pending', 'Feedback in progress'].includes(x.status));
  const awaitingApproval = withStatus.filter((x) => x.status === 'Owner review');
  const overdue = withStatus.filter((x) => x.overdue);

  const pendingActions = withStatus
    .filter((x) => !['Completed', 'Scheduled'].includes(x.status))
    .sort((x, y) => Number(y.overdue) - Number(x.overdue) || new Date(x.a.schedule) - new Date(y.a.schedule));

  const reminderCount = withStatus.reduce((n, x) => {
    if (['Feedback pending', 'Feedback in progress'].includes(x.status) && new Date(x.a.schedule) < new Date()) return n + pendingInterviewerIds(db, x.a).length;
    if (['Awaiting final decision', 'Returned to FDM'].includes(x.status)) return n + 1;
    return n;
  }, 0);

  const upcoming = withStatus.filter((x) => x.status === 'Scheduled').sort((x, y) => new Date(x.a.schedule) - new Date(y.a.schedule));

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${currentUser.name.split(' ')[0]}`}
        subtitle={isOwner ? 'Here is what needs your attention across your interview projects.' : 'Organisation-wide view of interview activity.'}
        actions={isOwner && <Button icon={LuPlus} onClick={() => navigate('/projects/new')}>New project</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Active projects" value={projects.filter((p) => p.status === 'Active').length} icon={LuFolderKanban} tone="indigo" />
        <Stat label="Candidates" value={candidates.length} icon={LuUsers} tone="sky" hint={`${candidates.filter((c) => c.status === 'Interviewing').length} interviewing`} />
        <Stat label="Awaiting feedback" value={awaitingFeedback.length} icon={LuClock} tone="amber" hint={overdue.length ? `${overdue.length} overdue` : 'None overdue'} />
        <Stat label={isOwner ? 'Awaiting your approval' : 'Awaiting owner approval'} value={awaitingApproval.length} icon={LuGavel} tone="violet" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Pending actions"
            subtitle="Interviews waiting on feedback, a final decision or your approval"
            actions={
              isOwner && (
                <Button
                  variant="secondary"
                  size="sm"
                  icon={LuSend}
                  disabled={reminderCount === 0}
                  onClick={() => { sendReminders(); toast(`Sent ${reminderCount} reminder${reminderCount === 1 ? '' : 's'}${overdue.length ? ` and escalated ${overdue.length} overdue` : ''}`); }}
                >
                  Send reminders
                </Button>
              )
            }
          />
          {pendingActions.length === 0 ? (
            <Empty icon={LuCircleCheck} title="Nothing pending" text="All interviews are either scheduled or complete." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {pendingActions.map(({ a, status, overdue: od }) => {
                const c = db.candidates.find((x) => x.id === a.candidateId);
                const p = db.projects.find((x) => x.id === a.projectId);
                const waitingOn =
                  status === 'Owner review' ? [currentUser.id]
                  : ['Awaiting final decision', 'Returned to FDM'].includes(status) ? [a.fdmId]
                  : pendingInterviewerIds(db, a);
                return (
                  <li key={a.id}>
                    <Link to={status === 'Owner review' && isOwner ? '/approvals' : `/interviews/${a.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50">
                      <Avatar name={c?.name} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-slate-900">{c?.name}</span>
                          <TypeBadge type={a.type} />
                          {od && <Badge tone="rose" icon={LuTriangleAlert}>Overdue</Badge>}
                        </div>
                        <p className="mt-0.5 truncate text-sm text-slate-500">
                          {p?.role} · {a.stageName} · waiting on {waitingOn.map((id) => (id === currentUser.id ? 'you' : userById(id)?.name)).join(', ')}
                        </p>
                      </div>
                      <div className="hidden text-right sm:block">
                        <StatusBadge status={status} />
                        <p className="mt-1 text-xs text-slate-400">Interview {timeAgo(a.schedule)}</p>
                      </div>
                      <LuChevronRight className="h-4 w-4 text-slate-300" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader title="Upcoming interviews" />
            {upcoming.length === 0 ? (
              <p className="px-5 py-6 text-sm text-slate-500">No upcoming interviews.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {upcoming.slice(0, 5).map(({ a }) => {
                  const c = db.candidates.find((x) => x.id === a.candidateId);
                  return (
                    <li key={a.id}>
                      <Link to={`/interviews/${a.id}`} className="block px-5 py-3 hover:bg-slate-50">
                        <p className="text-sm font-medium text-slate-900">{c?.name} · {a.stageName}</p>
                        <p className="text-xs text-slate-500">{formatDateTime(a.schedule)} · {a.interviewerIds.map((i) => userById(i)?.name).join(', ')}</p>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="Projects" actions={<Link to="/projects" className="text-sm font-medium text-indigo-600 hover:text-indigo-800">View all</Link>} />
            <ul className="divide-y divide-slate-100">
              {projects.map((p) => {
                const cs = db.candidates.filter((c) => c.projectId === p.id);
                return (
                  <li key={p.id}>
                    <Link to={`/projects/${p.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">{p.role}</p>
                        <p className="truncate text-xs text-slate-500">{p.designation}</p>
                      </div>
                      <span className="text-xs text-slate-500">{cs.length} candidates</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card className="border-violet-200 bg-violet-50/50 p-5">
            <p className="flex items-center gap-2 text-sm font-semibold text-violet-800"><LuSparkles className="h-4 w-4" /> AI insight</p>
            <p className="mt-2 text-sm text-violet-900/80">
              {overdue.length
                ? `${overdue.length} interview${overdue.length > 1 ? 's are' : ' is'} overdue for feedback. Sending reminders now typically cuts time-to-decision by a day.`
                : awaitingApproval.length
                  ? `${awaitingApproval.length} consolidated decision${awaitingApproval.length > 1 ? 's are' : ' is'} ready for your approval.`
                  : 'Everything is on track. Consider adding more candidates to keep the pipeline healthy.'}
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
