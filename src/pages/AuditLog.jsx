// Owner / Admin: searchable record of every assignment, feedback, decision and status change.
import { useState } from 'react';
import { LuSearch, LuShieldCheck } from 'react-icons/lu';
import { useStore } from '../store/store';
import { Card, Input, Select, PageHeader, Avatar, Badge } from '../components/ui';
import { formatDateTime } from '../utils';

const TONE = {
  'Decision approved': 'emerald', 'Decision returned': 'rose', 'Final decision submitted': 'violet', 'Feedback submitted': 'indigo',
  'Interview assigned': 'sky', 'Reminders sent': 'amber', 'Signed in': 'slate',
};

export default function AuditLog() {
  const { db, userById } = useStore();
  const [q, setQ] = useState('');
  const [action, setAction] = useState('');
  const actions = [...new Set(db.audit.map((l) => l.action))].sort();
  const rows = db.audit.filter(
    (l) => (!action || l.action === action) && (!q || `${l.detail} ${userById(l.actorId)?.name}`.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div>
      <PageHeader
        title="Audit log"
        subtitle="Append-only record of assignments, feedback, decisions and status changes."
        eyebrow={<Badge tone="emerald" icon={LuShieldCheck}>Tamper-evident in production</Badge>}
      />
      <Card>
        <div className="flex flex-wrap gap-3 border-b border-slate-100 p-4">
          <div className="relative w-full max-w-sm">
            <LuSearch className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input className="pl-9" placeholder="Search details or person" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select className="w-56" value={action} onChange={(e) => setAction(e.target.value)}>
            <option value="">All actions</option>
            {actions.map((a) => <option key={a}>{a}</option>)}
          </Select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">When</th>
                <th className="px-5 py-3">Who</th>
                <th className="px-5 py-3">Action</th>
                <th className="px-5 py-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((l) => {
                const u = userById(l.actorId);
                return (
                  <tr key={l.id}>
                    <td className="whitespace-nowrap px-5 py-3 text-slate-500">{formatDateTime(l.at)}</td>
                    <td className="px-5 py-3"><span className="flex items-center gap-2 whitespace-nowrap"><Avatar name={u?.name} size="sm" />{u?.name}</span></td>
                    <td className="px-5 py-3"><Badge tone={TONE[l.action] || 'slate'}>{l.action}</Badge></td>
                    <td className="px-5 py-3 text-slate-700">{l.detail}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.length === 0 && <p className="px-5 py-8 text-center text-sm text-slate-500">No matching entries.</p>}
        </div>
      </Card>
    </div>
  );
}
