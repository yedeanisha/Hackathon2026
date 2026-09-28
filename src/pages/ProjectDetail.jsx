// One project: candidates ranked by AI fit, interviews, decisions, and the role details.
import { useState } from 'react';
import { LuArrowLeft, LuUpload, LuPlus, LuUsers, LuClipboardCheck, LuGavel, LuTriangleAlert, LuCrown, LuSearch } from 'react-icons/lu';
import { useStore, assignmentStatus, isOverdue, finalFor, feedbackFor } from '../store/store';
import { Card, CardHeader, Button, Tabs, StatusBadge, TypeBadge, DecisionBadge, FitScore, Badge, Empty, PageHeader, Avatar, Input, CandidateResponseBadge } from '../components/ui';
import CandidateUploadModal from '../components/CandidateUploadModal';
import CandidateProfileModal from '../components/CandidateProfileModal';
import AssignmentModal from '../components/AssignmentModal';
import DecisionReviewCard from '../components/DecisionReviewCard';
import { Link, useNavigate, useRouter } from '../router';
import { formatDate, formatDateTime } from '../utils';

export default function ProjectDetail({ id }) {
  const { db, currentUser, userById } = useStore();
  const { query } = useRouter();
  const navigate = useNavigate();
  const [tab, setTab] = useState(query.get('tab') || 'candidates');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [assignFor, setAssignFor] = useState(null); // null = closed, '' = any candidate, id = preselected
  const [profileId, setProfileId] = useState(null);
  const [search, setSearch] = useState('');

  const project = db.projects.find((p) => p.id === id);
  if (!project) return <Empty title="Project not found" action={<Button variant="secondary" onClick={() => navigate('/projects')}>Back to projects</Button>} />;

  const isOwner = currentUser.role === 'owner' && project.ownerId === currentUser.id;
  const candidates = db.candidates
    .filter((c) => c.projectId === id)
    .filter((c) => !search || `${c.name} ${c.skills.join(' ')} ${c.currentRole}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (b.fitScore ?? -1) - (a.fitScore ?? -1));
  const assignments = db.assignments.filter((a) => a.projectId === id).sort((a, b) => new Date(b.schedule) - new Date(a.schedule));
  const decisions = assignments.filter((a) => finalFor(db, a.id));
  const pendingDecisions = decisions.filter((a) => finalFor(db, a.id).ownerStatus === 'pending').length;

  return (
    <div>
      <PageHeader
        eyebrow={<Link to="/projects" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"><LuArrowLeft className="h-4 w-4" /> Projects</Link>}
        title={project.role}
        subtitle={`${project.designation} · ${project.department} · Owner: ${userById(project.ownerId)?.name} · Created ${formatDate(project.createdAt)}`}
        actions={isOwner && (
          <>
            <Button variant="secondary" icon={LuUpload} onClick={() => setUploadOpen(true)}>Add candidate</Button>
            <Button icon={LuPlus} onClick={() => setAssignFor('')} disabled={!db.candidates.some((c) => c.projectId === id)}>Assign interview</Button>
          </>
        )}
      />

      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'candidates', label: 'Candidates', count: db.candidates.filter((c) => c.projectId === id).length },
          { id: 'interviews', label: 'Interviews', count: assignments.length },
          { id: 'decisions', label: 'Decisions', count: pendingDecisions || undefined },
          { id: 'overview', label: 'Role & criteria' },
        ]}
      />

      <div className="mt-6">
        {tab === 'overview' && (
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader title="Job description" />
              <div className="space-y-5 p-5">
                <p className="text-sm leading-relaxed text-slate-700">{project.description}</p>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Responsibilities</p>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
                    {project.responsibilities.split('\n').filter(Boolean).map((r) => <li key={r}>{r}</li>)}
                  </ul>
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Required skills</p>
                  <div className="flex flex-wrap gap-1.5">{project.requiredSkills.map((s) => <Badge key={s} tone="indigo">{s}</Badge>)}</div>
                </div>
              </div>
            </Card>
            <div className="space-y-6">
              <Card>
                <CardHeader title="Interview stages" />
                <ol className="space-y-3 p-5">
                  {project.stages.map((s, i) => (
                    <li key={s.id} className="flex items-center gap-3 text-sm">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">{i + 1}</span>
                      <span className="flex-1 font-medium text-slate-800">{s.name}</span>
                      <TypeBadge type={s.type} />
                    </li>
                  ))}
                </ol>
              </Card>
              <Card>
                <CardHeader title="Evaluation criteria" />
                <ul className="space-y-3 p-5">
                  {project.criteria.map((c) => (
                    <li key={c.name} className="text-sm">
                      <div className="flex justify-between"><span className="text-slate-700">{c.name}</span><span className="tabular-nums text-slate-500">{c.weight}%</span></div>
                      <div className="mt-1 h-1.5 rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${c.weight}%` }} /></div>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </div>
        )}

        {tab === 'candidates' && (
          <Card>
            <CardHeader
              title="Candidates"
              subtitle="Ranked by AI fit score against the required skills"
              actions={<div className="relative w-56"><LuSearch className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><Input className="pl-9" placeholder="Search name or skill" value={search} onChange={(e) => setSearch(e.target.value)} /></div>}
            />
            {candidates.length === 0 ? (
              <Empty
                icon={LuUsers}
                title={search ? 'No matching candidates' : 'No candidates yet'}
                text={search ? 'Try a different search.' : 'Upload a resume and AI will extract the details and score the fit.'}
                action={isOwner && !search && <Button icon={LuUpload} onClick={() => setUploadOpen(true)}>Add candidate</Button>}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-3">Candidate</th>
                      <th className="px-5 py-3">Experience</th>
                      <th className="px-5 py-3">Skills</th>
                      <th className="px-5 py-3">AI fit</th>
                      <th className="px-5 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {candidates.map((c) => (
                      <tr key={c.id} onClick={() => setProfileId(c.id)} className="cursor-pointer hover:bg-slate-50">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar name={c.name} size="sm" />
                            <div className="min-w-0">
                              <p className="font-medium text-slate-900">{c.name}</p>
                              <p className="truncate text-xs text-slate-500">{c.currentRole || c.email}</p>
                              {c.source === 'Self-applied' && <Badge tone="sky" className="mt-1">Applied via portal</Badge>}
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-slate-600">{c.experience} yrs</td>
                        <td className="px-5 py-3">
                          <div className="flex max-w-xs flex-wrap gap-1">
                            {c.skills.slice(0, 4).map((s) => (
                              <Badge key={s} tone={project.requiredSkills.some((r) => r.toLowerCase() === s.toLowerCase()) ? 'emerald' : 'slate'}>{s}</Badge>
                            ))}
                            {c.skills.length > 4 && <span className="text-xs text-slate-400">+{c.skills.length - 4}</span>}
                          </div>
                        </td>
                        <td className="px-5 py-3"><FitScore score={c.fitScore} /></td>
                        <td className="px-5 py-3"><StatusBadge status={c.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {tab === 'interviews' && (
          <Card>
            <CardHeader title="Interviews" subtitle="Every stage assignment and its progress" />
            {assignments.length === 0 ? (
              <Empty icon={LuClipboardCheck} title="No interviews assigned" text="Assign a candidate to an interview stage and panel." action={isOwner && <Button icon={LuPlus} onClick={() => setAssignFor('')}>Assign interview</Button>} />
            ) : (
              <ul className="divide-y divide-slate-100">
                {assignments.map((a) => {
                  const c = db.candidates.find((x) => x.id === a.candidateId);
                  const status = assignmentStatus(db, a);
                  const fin = finalFor(db, a.id);
                  const done = feedbackFor(db, a.id).length;
                  return (
                    <li key={a.id}>
                      <Link to={`/interviews/${a.id}`} className="flex flex-wrap items-center gap-4 px-5 py-4 hover:bg-slate-50">
                        <Avatar name={c?.name} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-slate-900">{c?.name}</span>
                            <span className="text-slate-400">·</span>
                            <span className="text-sm text-slate-700">{a.stageName}</span>
                            <TypeBadge type={a.type} />
                            {isOverdue(db, a) && <Badge tone="rose" icon={LuTriangleAlert}>Overdue</Badge>}
                            {status === 'Scheduled' && <CandidateResponseBadge response={a.candidateResponse} />}
                          </div>
                          <p className="mt-0.5 text-sm text-slate-500">
                            {formatDateTime(a.schedule)} · {a.interviewerIds.map((i) => (
                              <span key={i} className="mr-1">{userById(i)?.name}{i === a.fdmId && a.interviewerIds.length > 1 && <LuCrown className="ml-0.5 inline h-3 w-3 text-amber-500" />}{i !== a.interviewerIds.at(-1) && ','}</span>
                            ))}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs tabular-nums text-slate-500">{done}/{a.interviewerIds.length} feedback</span>
                          {fin && <DecisionBadge decision={fin.decision} />}
                          <StatusBadge status={status} />
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        )}

        {tab === 'decisions' && (
          decisions.length === 0 ? (
            <Card><Empty icon={LuGavel} title="No decisions yet" text="Consolidated decisions from Final Decision Makers will appear here for your approval." /></Card>
          ) : (
            <div className="space-y-4">
              {decisions
                .sort((a, b) => (finalFor(db, a.id).ownerStatus === 'pending' ? -1 : 1) - (finalFor(db, b.id).ownerStatus === 'pending' ? -1 : 1))
                .map((a) => <DecisionReviewCard key={a.id} assignment={a} />)}
            </div>
          )
        )}
      </div>

      {isOwner && <CandidateUploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} project={project} />}
      {isOwner && <AssignmentModal open={assignFor !== null} onClose={() => setAssignFor(null)} project={project} candidateId={assignFor} />}
      {profileId && (
        <CandidateProfileModal
          candidate={db.candidates.find((c) => c.id === profileId)}
          project={project}
          onClose={() => setProfileId(null)}
          onAssign={(cid) => { setProfileId(null); setAssignFor(cid); }}
        />
      )}
    </div>
  );
}
