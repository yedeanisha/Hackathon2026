// Tiny hash-based router (no dependency). Hash routing also works on
// Firebase Hosting without any rewrite rules.
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const RouterCtx = createContext(null);
const readHash = () => window.location.hash.replace(/^#/, '') || '/';

export function HashRouter({ children }) {
  const [location, setLocation] = useState(readHash);
  useEffect(() => {
    const onChange = () => {
      setLocation(readHash());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  const navigate = useCallback((to) => {
    if (to !== readHash()) window.location.hash = to;
  }, []);
  const [pathname, search = ''] = location.split('?');
  return (
    <RouterCtx.Provider value={{ pathname, query: new URLSearchParams(search), navigate }}>
      {children}
    </RouterCtx.Provider>
  );
}

export const useRouter = () => useContext(RouterCtx);
export const useNavigate = () => useContext(RouterCtx).navigate;

/** matchPath('/projects/:id', '/projects/p1') -> { id: 'p1' } | null */
export function matchPath(pattern, pathname) {
  const p = pattern.split('/').filter(Boolean);
  const s = pathname.split('/').filter(Boolean);
  if (p.length !== s.length) return null;
  const params = {};
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(':')) params[p[i].slice(1)] = decodeURIComponent(s[i]);
    else if (p[i] !== s[i]) return null;
  }
  return params;
}

export function Link({ to, className, children, onClick, ...rest }) {
  const navigate = useNavigate();
  return (
    <a
      href={'#' + to}
      className={className}
      {...rest}
      onClick={(e) => {
        onClick?.(e);
        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        navigate(to);
      }}
    >
      {children}
    </a>
  );
}

export function NavLink({ to, end, className, children }) {
  const { pathname } = useRouter();
  const isActive = end ? pathname === to : pathname === to || pathname.startsWith(to + '/');
  return (
    <Link to={to} className={typeof className === 'function' ? className({ isActive }) : className}>
      {children}
    </Link>
  );
}
