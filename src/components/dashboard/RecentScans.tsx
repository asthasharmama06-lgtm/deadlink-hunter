import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { ScanJob, ScanStatus } from '../../types/scan';
import { formatDate, hostOf, statusLabel } from '../../utils/formatters';
import Badge, { type Tone } from '../common/Badge';
import EmptyState from '../common/EmptyState';

export const statusTone: Record<ScanStatus, Tone> = { completed: 'ok', running: 'brand', queued: 'neutral', failed: 'bad', cancelled: 'warn' };
const FILTERS = ['all', 'completed', 'running', 'failed'] as const;
const filterLabel = { all: 'All', completed: 'Completed', running: 'In Progress', failed: 'Failed' };

export default function RecentScans({ scans, showFilters = true }: { scans: ScanJob[]; showFilters?: boolean }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all');
  const rows = scans.filter((s) => filter === 'all' || s.status === filter);
  return (
    <div className="card overflow-hidden">
      {showFilters && (
        <div className="flex flex-wrap gap-2 border-b border-edge p-3" role="tablist">
          {FILTERS.map((f) => (
            <button key={f} role="tab" aria-selected={filter === f} onClick={() => setFilter(f)} className={`rounded-lg px-3 py-1.5 text-sm transition ${filter === f ? 'bg-brand/15 text-brand-soft' : 'text-slate-400 hover:text-slate-100'}`}>{filterLabel[f]}</button>
          ))}
        </div>
      )}
      {rows.length === 0 ? <EmptyState title="No scans match this filter" hint="Try another status, or start a new scan from Home." /> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-edge text-xs text-slate-500"><tr><th className="px-4 py-3 font-medium">Site</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Started</th><th className="px-4 py-3 text-right font-medium">Score</th></tr></thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} className="border-b border-edge/60 transition last:border-0 hover:bg-panel/60">
                  <td className="px-4 py-3"><Link to={`/scan/${s.id}`} className="font-medium text-slate-100 hover:text-brand-soft">{hostOf(s.url)}</Link></td>
                  <td className="px-4 py-3"><Badge tone={statusTone[s.status]} pulse={s.status === 'running'}>{statusLabel[s.status]}</Badge></td>
                  <td className="px-4 py-3 text-slate-400">{formatDate(s.startedAt)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{s.summary?.healthScore ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
