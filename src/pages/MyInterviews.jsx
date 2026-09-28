// Interviewer home: interviews needing feedback, final decisions due (as FDM), and submitted ones.
import { useState } from 'react';
import { LuCrown, LuCalendar, LuChevronRight, LuTriangleAlert, LuClipboardCheck, LuInbox } from 'react-icons/lu';
import { useStore, assignmentStatus, isOverdue, feedbackFor, finalFor } from '../store/store';
import { Card, Tabs, TypeBadge, StatusBadge, Badge, Empty, PageHeader, Avatar, DecisionBadge } from '../components/ui';
import { Link } from '../router';
import { formatDateTime, timeAgo } from '../utils';

export default function MyInterviews() {
  const { db, currentUser } = useStore();
  const [picked, setTab] = useState(null);
  const me = currentUser.id;

  const mine = db.assignments.filter((a) => a.interviewerIds.includes(me)).map((a) => {
    const fbs = feedbackFor(db, a.id);
    const fin = finalFor(db, a.id);
    const myFb = fbs.find((f) => f.interviewerId === me);
    const allIn = fbs.length >= a.interviewerIds.length;
    const fdmAction = a.fdmId === me && allIn && (!fin || fin.ownerStatus === 'returned');
    return { a, myFb, fin, fdmAction, status: assignmentStatus(db, a) };
  });

  const todo = mine.filter((x) => !x.myFb).sort((x, y) => new Date(x.a.schedule) - new Date(y.a.schedule));
  const fdm = mine.filter((x) => x.fdmAction);
  const done = mine.filter((x) => x.myFb && !x.fdmAction);
  const lists = { todo, fdm, done };
  // Open on whatever needs this person first: feedback to write, then final decisions.
  const tab = picked ?? (todo.length ? 'todo' : fdm.length ? 'fdm' : 'done');

  return (
    <div>
      <PageHeader title="My interviews" subtitle="Interviews assigned to you. Open one to see the resume, role details and evaluation form." />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card className="p-4"><p className="text-sm text-slate-500">Feedback to submit</p><p className="mt-1 text-2xl font-semibold tabular-nums">{todo.length}</p></Card>
        <Card className="p-4"><p className="flex items-center gap-1.5 text-sm text-slate-500"><LuCrown className="h-4 w-4 text-amber-500" /> Final decisions due</p><p className="mt-1 text-2xl font-semibold tabular-nums">{fdm.length}</p></Card>
        <Card className="p-4"><p className="text-sm text-slate-500">Completed</p><p className="mt-1 text-2xl font-semibold tabular-nums">{done.length}</p></Card>
      </div>

      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'todo', label: 'To do', count: todo.length },
          { id: 'fdm', label: 'Final decisions', count: fdm.length },
          { id: 'done', label: 'Submitted', count: done.length },
        ]}
      />

      <div className="mt-6">
        {mine.length === 0 ? (
          <Card>
            <Empty
              icon={LuInbox}
              title="No interviews assigned to you yet"
              text={`You're signed in as ${currentUser.email}. If you expected interviews here, ask the project owner to check that this is the email on your interviewer profile (Interviewers page).`}
            />
          </Card>
        ) : lists[tab].length === 0 ? (
          <Card>
            <Empty
              icon={tab === 'done' ? LuClipboardCheck : LuInbox}
              title={tab === 'todo' ? 'No feedback due' : tab === 'fdm' ? 'No final decisions due' : 'Nothing submitted yet'}
              text={tab === 'fdm' ? 'When you are the Final Decision Maker and all feedback is in, it will appear here.' : undefined}
            />
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {lists[tab].map(({ a, myFb, fin, status }) => {
              const c = db.candidates.find((x) => x.id === a.candidateId);
              const p = db.projects.find((x) => x.id === a.projectId);
              const od = isOverdue(db, a) && !myFb;
              return (
                <Link key={a.id} to={`/interviews/${a.id}`} className="group min-w-0">
                  <Card className="h-full p-5 transition group-hover:border-indigo-300 group-hover:shadow-md">
                    <div className="flex items-start gap-3">
                      <Avatar name={c?.name} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-slate-900 group-hover:text-indigo-700">{c?.name}</p>
                          {a.fdmId === currentUser.id && a.interviewerIds.length > 1 && <Badge tone="amber" icon={LuCrown}>FDM</Badge>}
                        </div>
                        <p className="truncate text-sm text-slate-500">{p?.role} · {a.stageName}</p>
                      </div>
                      <LuChevronRight className="h-5 w-5 text-slate-300 group-hover:text-indigo-400" />
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <TypeBadge type={a.type} />
                      <span className="flex items-center gap-1 text-xs text-slate-500"><LuCalendar className="h-3.5 w-3.5" /> {formatDateTime(a.schedule)}</span>
                      {od && <Badge tone="rose" icon={LuTriangleAlert}>Feedback overdue</Badge>}
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
                      <span>{myFb ? `You submitted ${timeAgo(myFb.submittedAt)}` : `Interview ${timeAgo(a.schedule)}`}</span>
                      <span className="flex gap-1.5">
                        {myFb && <DecisionBadge decision={myFb.decision} />}
                        {fin?.ownerStatus === 'returned' && a.fdmId === currentUser.id ? <Badge tone="rose">Returned by owner</Badge> : <StatusBadge status={status} />}
                      </span>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
