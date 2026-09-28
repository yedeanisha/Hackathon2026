// Owner / Admin: all interview projects as cards.
import { LuPlus, LuFolderKanban, LuUsers, LuClipboardCheck } from 'react-icons/lu';
import { useStore } from '../store/store';
import { Card, Button, StatusBadge, TypeBadge, PageHeader, Empty } from '../components/ui';
import { Link, useNavigate } from '../router';
import { formatDate } from '../utils';

export default function Projects() {
  const { db, currentUser, userById } = useStore();
  const navigate = useNavigate();
  const isOwner = currentUser.role === 'owner';
  const projects = isOwner ? db.projects.filter((p) => p.ownerId === currentUser.id) : db.projects;

  return (
    <div>
      <PageHeader
        title="Interview projects"
        subtitle="Each project defines a role, its interview stages and how candidates are evaluated."
        actions={isOwner && <Button icon={LuPlus} onClick={() => navigate('/projects/new')}>New project</Button>}
      />
      {projects.length === 0 ? (
        <Card>
          <Empty icon={LuFolderKanban} title="No projects yet" text="Create your first interview project to start adding candidates." action={isOwner && <Button icon={LuPlus} onClick={() => navigate('/projects/new')}>New project</Button>} />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => {
            const cands = db.candidates.filter((c) => c.projectId === p.id);
            const interviews = db.assignments.filter((a) => a.projectId === p.id);
            return (
              <Link key={p.id} to={`/projects/${p.id}`} className="group min-w-0">
                <Card className="flex h-full flex-col p-5 transition group-hover:border-indigo-300 group-hover:shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold text-slate-900 group-hover:text-indigo-700">{p.role}</h3>
                      <p className="truncate text-sm text-slate-500">{p.designation} · {p.department}</p>
                    </div>
                    <StatusBadge status={p.status} />
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm text-slate-600">{p.description}</p>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {p.stages.map((s) => <TypeBadge key={s.id} type={s.type} />)}
                  </div>
                  <div className="mt-auto flex items-center gap-4 border-t border-slate-100 pt-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><LuUsers className="h-3.5 w-3.5" /> {cands.length} candidates</span>
                    <span className="flex items-center gap-1"><LuClipboardCheck className="h-3.5 w-3.5" /> {interviews.length} interviews</span>
                    <span className="ml-auto">{isOwner ? formatDate(p.createdAt) : userById(p.ownerId)?.name}</span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
