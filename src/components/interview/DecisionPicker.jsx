// Four buttons for the hiring recommendation: Proceed, Hold, Reject, Recommend for another role.
// Used by the interviewer's feedback form and the Final Decision Maker's form.
import { DECISIONS } from '../../data/seed';
import { cx } from '../ui';

const SELECTED_STYLE = {
  Proceed: 'peer-checked:border-emerald-500 peer-checked:bg-emerald-50 peer-checked:text-emerald-800',
  Hold: 'peer-checked:border-amber-500 peer-checked:bg-amber-50 peer-checked:text-amber-800',
  Reject: 'peer-checked:border-rose-500 peer-checked:bg-rose-50 peer-checked:text-rose-800',
  'Recommend for another role': 'peer-checked:border-sky-500 peer-checked:bg-sky-50 peer-checked:text-sky-800',
};

export default function DecisionPicker({ name, value, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {DECISIONS.map((decision) => (
        <label key={decision} className="cursor-pointer">
          <input type="radio" name={name} className="peer sr-only" checked={value === decision} onChange={() => onChange(decision)} />
          <span
            className={cx(
              'flex h-full items-center justify-center rounded-lg border border-slate-200 px-2 py-2.5 text-center text-sm font-medium text-slate-600 transition hover:bg-slate-50',
              SELECTED_STYLE[decision]
            )}
          >
            {decision}
          </span>
        </label>
      ))}
    </div>
  );
}
