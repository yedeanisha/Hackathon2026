// Candidate profile dialog and the resume view reused on the interview page.
import { LuMail, LuPhone, LuMapPin, LuGraduationCap, LuBriefcase, LuFileText, LuPlus, LuExternalLink } from 'react-icons/lu';
import { useStore, resumeFiles, assignmentStatus, finalFor } from '../store/store';
import { Modal, Button, Badge, FitScore, StatusBadge, TypeBadge, DecisionBadge, Select, AIPanel, Avatar } from './ui';
import { Link } from '../router';
import { CANDIDATE_STATUSES } from '../data/seed';
import { formatDateTime } from '../utils';

/** The parsed resume view — shown to owners and to assigned interviewers only. */
export function ResumeView({ candidate, requiredSkills = [] }) {
  const fileUrl = resumeFiles.get(candidate.id);
  const has = (s) => requiredSkills.some((r) => r.toLowerCase() === s.toLowerCase());
  return (
    <div className="space-y-5">
      <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
        {candidate.currentRole && <p className="flex items-center gap-2"><LuBriefcase className="h-4 w-4 text-slate-400" /> {candidate.currentRole}</p>}
        <p className="flex items-center gap-2"><LuBriefcase className="h-4 w-4 text-slate-400" /> {candidate.experience} years experience</p>
        {candidate.email && <p className="flex min-w-0 items-center gap-2"><LuMail className="h-4 w-4 shrink-0 text-slate-400" /> <span className="truncate" title={candidate.email}>{candidate.email}</span></p>}
        {candidate.phone && <p className="flex items-center gap-2"><LuPhone className="h-4 w-4 text-slate-400" /> {candidate.phone}</p>}
        {candidate.location && <p className="flex items-center gap-2"><LuMapPin className="h-4 w-4 text-slate-400" /> {candidate.location}</p>}
        {candidate.education && <p className="flex items-center gap-2"><LuGraduationCap className="h-4 w-4 text-slate-400" /> {candidate.education}</p>}
      </div>

      {candidate.summary && <p className="text-sm leading-relaxed text-slate-700">{candidate.summary}</p>}

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Skills</p>
        <div className="flex flex-wrap gap-1.5">
          {candidate.skills.map((s) => <Badge key={s} tone={has(s) ? 'emerald' : 'slate'}>{s}</Badge>)}
        </div>
        {requiredSkills.length > 0 && <p className="mt-2 text-xs text-slate-500">Green = matches a required skill for this role</p>}
      </div>

      {candidate.highlights?.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Experience highlights</p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
            {candidate.highlights.map((h) => <li key={h}>{h}</li>)}
          </ul>
        </div>
      )}

      {candidate.resumeName && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
          <span className="flex min-w-0 items-center gap-2 text-sm">
            <LuFileText className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="truncate">{candidate.resumeName}</span>
          </span>
          {fileUrl ? (
            <a href={fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-800">
              Open <LuExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : (
            <span className="text-xs text-slate-400">Served via signed URL in production</span>
          )}
        </div>
      )}
    </div>
  );
}

export default function CandidateProfileModal({ candidate, project, onClose, onAssign }) {
  const { db, currentUser, updateCandidateStatus, userById } = useStore();
  if (!candidate) return null;
  const isOwner = currentUser.role === 'owner';
  const interviews = db.assignments.filter((a) => a.candidateId === candidate.id);

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={
        <span className="flex items-center gap-3">
          <Avatar name={candidate.name} />
          <span>{candidate.name}</span>
        </span>
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Close</Button>
          {isOwner && <Button icon={LuPlus} onClick={() => onAssign(candidate.id)}>Assign interview</Button>}
        </>
      }
    >
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <span className="text-sm text-slate-500">Application status</span>
        {isOwner ? (
          <Select className="w-44" value={candidate.status} onChange={(e) => updateCandidateStatus(candidate.id, e.target.value)}>
            {CANDIDATE_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </Select>
        ) : (
          <StatusBadge status={candidate.status} />
        )}
      </div>

      {candidate.fitScore != null && (
        <AIPanel title="AI fit assessment" className="mb-5">
          <div className="flex flex-wrap items-center gap-4">
            <FitScore score={candidate.fitScore} />
            <p className="min-w-0 flex-1 text-sm text-slate-700">{candidate.fitReason}</p>
          </div>
          {candidate.gaps?.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-medium text-slate-500">Probe in interview:</span>
              {candidate.gaps.map((g) => <Badge key={g} tone="amber">{g}</Badge>)}
            </div>
          )}
        </AIPanel>
      )}

      <ResumeView candidate={candidate} requiredSkills={project.requiredSkills} />

      <div className="mt-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Interviews</p>
        {interviews.length === 0 ? (
          <p className="text-sm text-slate-500">No interviews assigned yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {interviews.map((a) => {
              const fin = finalFor(db, a.id);
              return (
                <li key={a.id}>
                  <Link to={`/interviews/${a.id}`} onClick={onClose} className="flex flex-wrap items-center gap-2 px-3 py-2.5 text-sm hover:bg-slate-50">
                    <span className="font-medium">{a.stageName}</span>
                    <TypeBadge type={a.type} />
                    <span className="text-slate-500">{formatDateTime(a.schedule)} · {a.interviewerIds.map((i) => userById(i)?.name).join(', ')}</span>
                    <span className="ml-auto flex gap-2">
                      {fin && <DecisionBadge decision={fin.decision} />}
                      <StatusBadge status={assignmentStatus(db, a)} />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Modal>
  );
}
