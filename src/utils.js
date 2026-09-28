// Small shared helpers: ids, dates and initials.
export const DAY = 24 * 60 * 60 * 1000;

export const uid = (prefix = 'id') => `${prefix}_${Math.random().toString(36).slice(2, 9)}`;

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

export function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const abs = Math.abs(diff);
  const future = diff < 0;
  const units = [
    [DAY, 'day'],
    [60 * 60 * 1000, 'hour'],
    [60 * 1000, 'min'],
  ];
  for (const [ms, label] of units) {
    if (abs >= ms) {
      const n = Math.floor(abs / ms);
      const text = `${n} ${label}${n > 1 ? 's' : ''}`;
      return future ? `in ${text}` : `${text} ago`;
    }
  }
  return 'just now';
}

/** ISO string for "n days from now at hh:mm" — keeps demo data fresh whenever it is loaded. */
export function daysFromNow(days, hour = 10, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

/** Value for <input type="datetime-local"> */
export function toLocalInput(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
