import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import RecentScans from '../components/dashboard/RecentScans';
import LoadingState from '../components/common/LoadingState';
import { getScanHistory } from '../services/scanService';
import type { ScanJob } from '../types/scan';

export default function HistoryPage() {
  const [scans, setScans] = useState<ScanJob[] | null>(null);
  const [q, setQ] = useState('');
  useEffect(() => { getScanHistory().then(setScans); }, []);
  if (!scans) return <LoadingState label="Loading history…" />;
  return (
    <div className="space-y-4">
      <div className="relative max-w-md"><Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" /><input className="field pl-10" placeholder="Search by site address" aria-label="Search history" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <RecentScans scans={scans.filter((s) => s.url.toLowerCase().includes(q.trim().toLowerCase()))} />
    </div>
  );
}
