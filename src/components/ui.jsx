// Shared UI building blocks (buttons, cards, badges, form fields, modal, toasts).
// Every page uses these so the look stays consistent; colours come from src/index.css.
import { useEffect, useState, createContext, useContext, useCallback } from 'react';
import { LuX, LuSparkles, LuLoaderCircle, LuStar, LuCircleCheck, LuCircleAlert, LuCalendarClock } from 'react-icons/lu';
import { initials } from '../utils';

export const cx = (...c) => c.filter(Boolean).join(' ');

// ---------- Buttons ----------
const BTN = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm',
  secondary: 'bg-white text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 shadow-sm',
  ghost: 'text-slate-600 hover:bg-slate-100',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm',
  ai: 'bg-violet-600 text-white hover:bg-violet-700 shadow-sm',
  aiSoft: 'bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200 hover:bg-violet-100',
};

export function Button({ variant = 'primary', size = 'md', className = '', loading = false, icon: Icon, children, disabled, type = 'button', ...p }) {
  const sz = size === 'sm' ? 'h-8 px-3 text-xs gap-1.5' : 'h-10 px-4 text-sm gap-2';
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cx(
        'inline-flex shrink-0 items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 disabled:cursor-not-allowed disabled:opacity-50',
        sz, BTN[variant], className
      )}
      {...p}
    >
      {loading ? <LuLoaderCircle className="h-4 w-4 animate-spin" /> : Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}

// ---------- Cards ----------
export function Card({ className = '', children, ...p }) {
  return <div className={cx('min-w-0 rounded-xl border border-slate-200 bg-white shadow-sm', className)} {...p}>{children}</div>;
}

export function CardHeader({ title, subtitle, actions, icon: Icon, className = '' }) {
  return (
    <div className={cx('flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4', className)}>
      <div className="flex min-w-0 items-start gap-3">
        {Icon && <Icon className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />}
        <div className="min-w-0">
          <h3 className="font-semibold text-slate-900">{title}</h3>
          {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

// ---------- Badges ----------
const TONES = {
  slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200',
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  rose: 'bg-rose-50 text-rose-700 ring-rose-200',
  sky: 'bg-sky-50 text-sky-700 ring-sky-200',
};

export function Badge({ tone = 'slate', className = '', children, icon: Icon }) {
  return (
    <span className={cx('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset', TONES[tone], className)}>
      {Icon && <Icon className="h-3 w-3" />}
      {children}
    </span>
  );
}

export const AIBadge = ({ children = 'AI draft' }) => <Badge tone="violet" icon={LuSparkles}>{children}</Badge>;

const STATUS_TONE = {
  Scheduled: 'sky', 'Feedback pending': 'amber', 'Feedback in progress': 'amber', 'Awaiting final decision': 'violet',
  'Owner review': 'indigo', 'Returned to FDM': 'rose', Completed: 'emerald',
  New: 'sky', Screening: 'slate', Interviewing: 'indigo', 'On hold': 'amber', Offer: 'emerald', Rejected: 'rose', Redirected: 'sky',
  Active: 'emerald', Closed: 'slate',
};
export const StatusBadge = ({ status }) => <Badge tone={STATUS_TONE[status] || 'slate'}>{status}</Badge>;

const DECISION_TONE = { Proceed: 'emerald', Hold: 'amber', Reject: 'rose', 'Recommend for another role': 'sky' };
export const DecisionBadge = ({ decision }) => <Badge tone={DECISION_TONE[decision] || 'slate'}>{decision}</Badge>;

const TYPE = { technical: ['Technical', 'indigo'], behavioural: ['Behavioural', 'sky'], managerial: ['Managerial', 'violet'], hr: ['HR', 'emerald'] };
export const TypeBadge = ({ type }) => <Badge tone={TYPE[type]?.[1] || 'slate'}>{TYPE[type]?.[0] || type}</Badge>;

// ---------- Form controls ----------
const inputCls =
  'block w-full rounded-lg border-0 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500';

export function Field({ label, hint, required, error, className = '', children }) {
  return (
    <label className={cx('block', className)}>
      {label && (
        <span className="mb-1.5 block text-sm font-medium text-slate-700">
          {label} {required && <span className="text-rose-500">*</span>}
        </span>
      )}
      {children}
      {error ? <span className="mt-1 block text-xs text-rose-600">{error}</span> : hint ? <span className="mt-1 block text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
}
export const Input = ({ className = '', ...p }) => <input className={cx(inputCls, className)} {...p} />;
export const Textarea = ({ className = '', rows = 3, ...p }) => <textarea rows={rows} className={cx(inputCls, 'resize-y', className)} {...p} />;
export const Select = ({ className = '', children, ...p }) => <select className={cx(inputCls, 'pr-8', className)} {...p}>{children}</select>;

export function TagInput({ value, onChange, placeholder = 'Type and press Enter' }) {
  const [text, setText] = useState('');
  const add = () => {
    const t = text.trim().replace(/,$/, '');
    if (t && !value.some((v) => v.toLowerCase() === t.toLowerCase())) onChange([...value, t]);
    setText('');
  };
  return (
    <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg bg-white px-2 py-1.5 shadow-sm ring-1 ring-inset ring-slate-300 focus-within:ring-2 focus-within:ring-indigo-500">
      {value.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
          {t}
          <button type="button" aria-label={`Remove ${t}`} onClick={() => onChange(value.filter((v) => v !== t))} className="text-indigo-400 hover:text-indigo-700">
            <LuX className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); }
          if (e.key === 'Backspace' && !text && value.length) onChange(value.slice(0, -1));
        }}
        onBlur={add}
        placeholder={value.length ? '' : placeholder}
        className="min-w-24 flex-1 border-0 bg-transparent p-1 text-sm focus:outline-none"
      />
    </div>
  );
}

export function RatingInput({ value = 0, onChange, readOnly = false, size = 'md' }) {
  const s = size === 'sm' ? 'h-4 w-4' : 'h-6 w-6';
  return (
    <div className="flex items-center gap-0.5" role={readOnly ? undefined : 'radiogroup'}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          aria-label={`${n} of 5`}
          onClick={() => onChange?.(n)}
          className={cx('rounded p-0.5 transition-transform', !readOnly && 'hover:scale-110', readOnly && 'cursor-default')}
        >
          <LuStar className={cx(s, n <= value ? 'fill-amber-400 text-amber-400' : 'text-slate-300')} />
        </button>
      ))}
    </div>
  );
}

// ---------- Layout bits ----------
export function PageHeader({ title, subtitle, actions, eyebrow }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <div className="mb-1">{eyebrow}</div>}
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

const STAT_TONE = {
  indigo: 'bg-indigo-50 text-indigo-600', amber: 'bg-amber-50 text-amber-600', violet: 'bg-violet-50 text-violet-600',
  emerald: 'bg-emerald-50 text-emerald-600', rose: 'bg-rose-50 text-rose-600', sky: 'bg-sky-50 text-sky-600',
};
export function Stat({ label, value, icon: Icon, tone = 'indigo', hint }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        {Icon && <span className={cx('rounded-lg p-2', STAT_TONE[tone])}><Icon className="h-4 w-4" /></span>}
      </div>
      <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </Card>
  );
}

export function Empty({ icon: Icon, title, text, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      {Icon && <span className="mb-3 rounded-full bg-slate-100 p-3 text-slate-400"><Icon className="h-6 w-6" /></span>}
      <p className="font-medium text-slate-900">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-slate-500">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

const AVATAR_COLORS = ['bg-indigo-100 text-indigo-700', 'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-800', 'bg-rose-100 text-rose-700', 'bg-sky-100 text-sky-700', 'bg-violet-100 text-violet-700'];
export function Avatar({ name = '', size = 'md', className = '' }) {
  const color = AVATAR_COLORS[[...name].reduce((h, c) => h + c.charCodeAt(0), 0) % AVATAR_COLORS.length];
  const sz = { sm: 'h-7 w-7 text-[11px]', md: 'h-9 w-9 text-xs', lg: 'h-12 w-12 text-sm' }[size];
  return <span className={cx('inline-flex shrink-0 items-center justify-center rounded-full font-semibold', sz, color, className)}>{initials(name)}</span>;
}

export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="-mb-px flex gap-1 overflow-x-auto border-b border-slate-200 scrollbar-thin">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={cx(
            'flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
            active === t.id ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
          )}
        >
          {t.label}
          {t.count != null && (
            <span className={cx('rounded-full px-1.5 py-0.5 text-[11px] tabular-nums', active === t.id ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600')}>{t.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

export function FitScore({ score, compact = false }) {
  if (score == null) return <span className="text-sm text-slate-400">—</span>;
  const color = score >= 80 ? 'bg-emerald-500' : score >= 65 ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <div className="flex items-center gap-2">
      <div className={cx('h-1.5 overflow-hidden rounded-full bg-slate-100', compact ? 'w-12' : 'w-20')}>
        <div className={cx('h-full rounded-full', color)} style={{ width: `${score}%` }} />
      </div>
      <span className="text-sm font-semibold tabular-nums text-slate-700">{score}</span>
    </div>
  );
}

// ---------- Modal ----------
export function Modal({ open, onClose, title, subtitle, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);
  if (!open) return null;
  const w = { md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }[size];
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-[1px] sm:p-8"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div role="dialog" aria-modal="true" className={cx('animate-fade-in w-full rounded-2xl bg-white shadow-2xl', w)}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <LuX className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 rounded-b-2xl border-t border-slate-100 bg-slate-50 px-6 py-3">{footer}</div>}
      </div>
    </div>
  );
}

// ---------- AI panel ----------
export function AIPanel({ title, children, actions, className = '' }) {
  return (
    <div className={cx('rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-4', className)}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-violet-800">
          <LuSparkles className="h-4 w-4" /> {title}
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}

// ---------- Toasts ----------
const ToastCtx = createContext(() => {});
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((text, tone = 'success') => {
    const id = Math.random();
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} className="animate-fade-in pointer-events-auto flex items-start gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-lg">
            {t.tone === 'error' ? <LuCircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" /> : <LuCircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />}
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

/** Shows whether the candidate confirmed their interview slot or asked to move it. */
export function CandidateResponseBadge({ response }) {
  if (!response) return null;
  return response.response === 'confirmed'
    ? <Badge tone="emerald" icon={LuCircleCheck}>Candidate confirmed</Badge>
    : <Badge tone="amber" icon={LuCalendarClock}>Reschedule requested</Badge>;
}
