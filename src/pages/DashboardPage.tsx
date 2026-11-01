import { useEffect, useState } from 'react';
import { Activity, Link2Off, Repeat, Timer } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import HealthScoreCard from '../components/dashboard/HealthScoreCard';
import RecentScans from '../components/dashboard/RecentScans';
import StatCard from '../components/dashboard/StatCard';
import Badge from '../components/common/Badge';
import LoadingState from '../components/common/LoadingState';
import { demoTrend } from '../data/demoData';
import { getScanHistory } from '../services/scanService';
import type { ScanJob } from '../types/scan';

export default function DashboardPage() {
  const [scans, setScans] = useState<ScanJob[] | null>(null);
  useEffect(() => { getScanHistory().then(setScans); }, []);
  if (!scans) return <LoadingState label="Loading scans…" />;

  const done = scans.filter((s) => s.summary);
  const sum = (k: 'totalLinks' | 'broken' | 'redirects') => done.reduce((a, s) => a + (s.summary?.[k] ?? 0), 0);
  const avg = done.length ? Math.round(done.reduce((a, s) => a + (s.summary?.healthScore ?? 0), 0) / done.length) : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Scans completed" value={done.length} hint="Across all sites" icon={Activity} />
        <StatCard label="Links checked" value={sum('totalLinks').toLocaleString()} icon={Timer} color="ok" />
        <StatCard label="Broken links" value={sum('broken')} hint="404, 5xx and timeouts" icon={Link2Off} color="bad" />
        <StatCard label="Redirects" value={sum('redirects')} hint="301, 302, 308" icon={Repeat} color="warn" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <HealthScoreCard score={avg} title="Average health" note="Mean score of completed scans" />
        <div className="card p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between"><h3 className="font-display font-semibold">Weekly trend</h3><Badge tone="warn">Illustrative data</Badge></div>
          <div className="h-48">
            <ResponsiveContainer>
              <AreaChart data={demoTrend} margin={{ left: -20, right: 8, top: 4 }}>
                <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7C8CFF" stopOpacity={0.4} /><stop offset="1" stopColor="#7C8CFF" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid stroke="#1E2B4A" strokeDasharray="3 5" vertical={false} />
                <XAxis dataKey="day" stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} domain={[50, 100]} />
                <Tooltip contentStyle={{ background: '#0F172A', border: '1px solid #1E2B4A', borderRadius: 12 }} labelStyle={{ color: '#E2E8F0' }} />
                <Area type="monotone" dataKey="score" name="Health score" stroke="#7C8CFF" strokeWidth={2} fill="url(#g)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      <div><h3 className="mb-3 font-display text-lg font-semibold">Recent scans</h3><RecentScans scans={scans} /></div>
    </div>
  );
}
