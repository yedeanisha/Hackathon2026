// App shell: sign-in gate, the list of pages, and which roles may open each page.
// The backend must enforce the same role rules; this only hides pages the user can't use.
import { LuLock, LuLoaderCircle } from 'react-icons/lu';
import { HashRouter, Link, matchPath, useRouter } from './router';
import { StoreProvider, useStore } from './store/store';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import { ToastProvider, Empty, Button } from './components/ui';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import NewProject from './pages/NewProject';
import ProjectDetail from './pages/ProjectDetail';
import Approvals from './pages/Approvals';
import Interviewers from './pages/Interviewers';
import AuditLog from './pages/AuditLog';
import MyInterviews from './pages/MyInterviews';
import InterviewWorkspace from './pages/InterviewWorkspace';
import CandidatePortal from './pages/CandidatePortal';
import OpenRoles from './pages/OpenRoles';

// Which roles can open which route. The backend enforces the same rules.
const ROUTES = [
  { path: '/', roles: ['owner', 'admin'], el: () => <Dashboard /> },
  { path: '/', roles: ['interviewer'], el: () => <MyInterviews /> },
  { path: '/', roles: ['candidate'], el: () => <CandidatePortal /> },
  { path: '/jobs', roles: ['candidate'], el: () => <OpenRoles /> },
  { path: '/projects', roles: ['owner', 'admin'], el: () => <Projects /> },
  { path: '/projects/new', roles: ['owner'], el: () => <NewProject /> },
  { path: '/projects/:id', roles: ['owner', 'admin'], el: (p) => <ProjectDetail key={p.id} id={p.id} /> },
  { path: '/approvals', roles: ['owner'], el: () => <Approvals /> },
  { path: '/interviewers', roles: ['owner', 'admin'], el: () => <Interviewers /> },
  { path: '/audit', roles: ['owner', 'admin'], el: () => <AuditLog /> },
  { path: '/interviews/:id', roles: ['owner', 'interviewer', 'admin'], el: (p) => <InterviewWorkspace key={p.id} id={p.id} /> },
];

function Routes() {
  const { pathname } = useRouter();
  const { currentUser } = useStore();
  const auth = useAuth();
  if (!auth.ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
        <LuLoaderCircle className="mr-2 h-5 w-5 animate-spin text-indigo-600" /> Checking your sign-in…
      </div>
    );
  }
  if (!auth.signedIn || !currentUser) return <Login />;

  let content = null;
  let forbidden = false;
  for (const r of ROUTES) {
    const params = matchPath(r.path, pathname);
    if (!params) continue;
    if (r.roles.includes(currentUser.role)) { content = r.el(params); break; }
    forbidden = true;
  }
  if (!content) {
    content = (
      <Empty
        icon={LuLock}
        title={forbidden ? 'You don’t have access to this page' : 'Page not found'}
        text={forbidden ? 'Your role does not allow this view.' : 'The page you are looking for does not exist.'}
        action={<Link to="/"><Button variant="secondary">Go home</Button></Link>}
      />
    );
  }
  return <Layout>{content}</Layout>;
}

export default function App() {
  return (
    <HashRouter>
      <StoreProvider>
        <AuthProvider>
          <ToastProvider>
            <Routes />
          </ToastProvider>
        </AuthProvider>
      </StoreProvider>
    </HashRouter>
  );
}
