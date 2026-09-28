// Project Owner: consolidated decisions waiting for approval, and those already reviewed.
import { useState } from 'react';
import { LuGavel } from 'react-icons/lu';
import { useStore, finalFor } from '../store/store';
import { Card, Empty, PageHeader, Tabs } from '../components/ui';
import DecisionReviewCard from '../components/DecisionReviewCard';

export default function Approvals() {
  const { db, currentUser } = useStore();
  const [tab, setTab] = useState('pending');
  const myProjects = new Set(db.projects.filter((p) => p.ownerId === currentUser.id).map((p) => p.id));
  const withFinal = db.assignments.filter((a) => myProjects.has(a.projectId) && finalFor(db, a.id));
  const pending = withFinal.filter((a) => finalFor(db, a.id).ownerStatus === 'pending');
  const reviewed = withFinal.filter((a) => finalFor(db, a.id).ownerStatus !== 'pending')
    .sort((a, b) => new Date(finalFor(db, b.id).reviewedAt) - new Date(finalFor(db, a.id).reviewedAt));
  const list = tab === 'pending' ? pending : reviewed;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Approvals" subtitle="Consolidated recommendations from Final Decision Makers, waiting for your decision." />
      <Tabs active={tab} onChange={setTab} tabs={[{ id: 'pending', label: 'Pending', count: pending.length }, { id: 'reviewed', label: 'Reviewed', count: reviewed.length }]} />
      <div className="mt-6 space-y-4">
        {list.length === 0 ? (
          <Card><Empty icon={LuGavel} title={tab === 'pending' ? 'No decisions waiting' : 'Nothing reviewed yet'} text={tab === 'pending' ? 'You will be notified when a Final Decision Maker submits a recommendation.' : undefined} /></Card>
        ) : (
          list.map((a) => <DecisionReviewCard key={a.id} assignment={a} />)
        )}
      </div>
    </div>
  );
}
