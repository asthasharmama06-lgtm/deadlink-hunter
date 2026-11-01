import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Lightbulb, X } from 'lucide-react';
import { Background, Controls, ReactFlow, type Edge, type Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import Badge, { type Tone } from '../components/common/Badge';
import EmptyState from '../components/common/EmptyState';
import LoadingState from '../components/common/LoadingState';
import HealthScoreCard from '../components/dashboard/HealthScoreCard';
import { getScan, getScanResults } from '../services/scanService';
import type { IssueCategory, LinkIssue, ScanJob } from '../types/scan';
import { formatMs, hostOf, severityLabel } from '../utils/formatters';

const CATS: { id: 'all' | IssueCategory; label: string }[] = [
  { id: 'all', label: 'All' }, { id: 'broken', label: '404 Not found' }, { id: 'server-error', label: 'Server errors' },
  { id: 'redirect', label: 'Redirects' }, { id: 'slow', label: 'Slow' }, { id: 'timeout', label: 'Timeouts' }
];
const sevTone: Record<string, Tone> = { critical: 'bad', warning: 'warn', info: 'brand' };
const codeTone = (c: number): Tone => (c >= 400 || c === 0 ? 'bad' : c >= 300 ? 'warn' : 'ok');

function LinkMap({ issues, host }: { issues: LinkIssue[]; host: string }) {
  const { nodes, edges } = useMemo(() => {
    const pages = [...new Set(issues.map((i) => i.sourcePage))].slice(0, 7);
    const ns: Node[] = [{ id: 'root', position: { x: 260, y: 150 }, data: { label: host }, style: { background: '#1E2B4A', color: '#E2E8F0', border: '1px solid #7C8CFF', borderRadius: 12, fontSize: 12 } }];
    const es: Edge[] = [];
    pages.forEach((p, i) => {
      const worst = issues.filter((x) => x.sourcePage === p).some((x) => x.severity === 'critical');
      const a = (i / pages.length) * Math.PI * 2;
      ns.push({ id: p, position: { x: 260 + Math.cos(a) * 230, y: 150 + Math.sin(a) * 130 }, data: { label: new URL(p).pathname }, style: { background: '#0F172A', color: '#E2E8F0', border: `1px solid ${worst ? '#F87171' : '#FBBF24'}`, borderRadius: 10, fontSize: 11 } });
      es.push({ id: `e${i}`, source: 'root', target: p, animated: true, style: { stroke: worst ? '#F87171' : '#FBBF24' } });
    });
    return { nodes: ns, edges: es };
  }, [issues, host]);
  return (
    <div className="card h-80 overflow-hidden" aria-label="Link map of pages containing issues">
      <ReactFlow nodes={nodes} edges={edges} fitView nodesConnectable={false} colorMode="dark" proOptions={{ hideAttribution: true }}><Background color="#1E2B4A" gap={20} /><Controls showInteractive={false} /></ReactFlow>
    </div>
  );
}

export default function ScanResultsPage() {
  const { id = '' } = useParams();
  const [job, setJob] = useState<ScanJob | null>(null);
  const [issues, setIssues] = useState<LinkIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [cat, setCat] = useState<'all' | IssueCategory>('all');
  const [sel, setSel] = useState<LinkIssue | null>(null);
  const [map, setMap] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([getScan(id), getScanResults(id)]).then(([j, r]) => { setJob(j); setIssues(j.status === 'completed' ? r : []); }).catch(() => setMissing(true)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingState label="Loading results…" />;
  if (missing || !job) return <EmptyState title="Scan not found" hint="It may have expired. Start a new scan from Home." action={<Link className="text-brand-soft underline" to="/">Go home</Link>} />;
  const rows = issues.filter((i) => cat === 'all' || i.category === cat);
  const s = job.summary;

  return (
    <div className="space-y-6">
      <Link to="/history" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-100"><ArrowLeft className="h-4 w-4" />History</Link>
      <div className="grid gap-4 lg:grid-cols-3">
        {s ? <HealthScoreCard score={s.healthScore} title={hostOf(job.url)} note={job.isDemo ? 'Demo data' : 'Live backend scan'} /> : <div className="card p-5 lg:col-span-1"><p className="font-display text-lg">{hostOf(job.url)}</p><Badge tone={job.status === 'failed' ? 'bad' : 'brand'}>{job.status}</Badge></div>}
        {s && <div className="card grid grid-cols-2 gap-4 p-5 sm:grid-cols-4 lg:col-span-2">{[['Links', s.totalLinks, ''], ['Healthy', s.healthy, 'text-ok'], ['Broken', s.broken, 'text-bad'], ['Redirects', s.redirects, 'text-warn']].map(([l, v, c]) => <div key={l as string}><p className="text-xs text-slate-500">{l}</p><p className={`font-display text-3xl font-bold tabular-nums ${c}`}>{v}</p></div>)}</div>}
      </div>

      {!s ? <div className="card"><EmptyState title={job.status === 'running' ? 'Scan still running' : 'No results for this scan'} hint="Results appear here once a scan completes." /></div> : (<>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2" role="tablist">{CATS.map((c) => <button key={c.id} role="tab" aria-selected={cat === c.id} onClick={() => setCat(c.id)} className={`rounded-lg border px-3 py-1.5 text-sm transition ${cat === c.id ? 'border-brand bg-brand/15 text-brand-soft' : 'border-edge text-slate-400 hover:text-slate-100'}`}>{c.label}</button>)}</div>
          <button onClick={() => setMap((m) => !m)} className="text-sm text-brand-soft underline underline-offset-4">{map ? 'Hide link map' : 'Show link map'}</button>
        </div>
        {map && <LinkMap issues={issues} host={hostOf(job.url)} />}
        <div className="card overflow-x-auto">
          {rows.length === 0 ? <EmptyState title="No issues in this category" /> : (
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-edge text-xs text-slate-500"><tr><th className="px-4 py-3 font-medium">Link</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Severity</th><th className="px-4 py-3 font-medium">Time</th></tr></thead>
              <tbody>{rows.map((i) => (
                <tr key={i.id} tabIndex={0} onClick={() => setSel(i)} onKeyDown={(e) => e.key === 'Enter' && setSel(i)} className={`cursor-pointer border-b border-edge/60 transition last:border-0 hover:bg-panel/60 ${sel?.id === i.id ? 'bg-panel' : ''}`}>
                  <td className="max-w-xs px-4 py-3"><p className="truncate font-medium text-slate-100">{i.url}</p><p className="truncate text-xs text-slate-500">on {new URL(i.sourcePage).pathname}</p></td>
                  <td className="px-4 py-3"><Badge tone={codeTone(i.statusCode)}>{i.statusCode || 'Timeout'}</Badge></td>
                  <td className="px-4 py-3"><Badge tone={sevTone[i.severity]}>{severityLabel[i.severity]}</Badge></td>
                  <td className="px-4 py-3 tabular-nums text-slate-400">{formatMs(i.responseMs)}</td>
                </tr>))}</tbody>
            </table>
          )}
        </div>
      </>)}

      <AnimatePresence>
        {sel && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-black/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSel(null)} />
            <motion.aside role="dialog" aria-label="Issue details" className="fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto border-l border-edge bg-base p-6" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 320, damping: 32 }}>
              <div className="mb-4 flex items-start justify-between gap-3"><h3 className="font-display text-lg font-semibold">Issue details</h3><button onClick={() => setSel(null)} aria-label="Close" className="rounded-lg p-1.5 text-slate-400 hover:bg-panel"><X className="h-5 w-5" /></button></div>
              <div className="mb-4 flex gap-2"><Badge tone={codeTone(sel.statusCode)}>{sel.statusCode || 'Timeout'}</Badge><Badge tone={sevTone[sel.severity]}>{severityLabel[sel.severity]}</Badge></div>
              <dl className="space-y-3 text-sm">{[['Broken link', sel.url], ['Found on', sel.sourcePage], ['Link text', sel.anchorText], ['Response time', formatMs(sel.responseMs)]].map(([k, v]) => <div key={k}><dt className="text-xs text-slate-500">{k}</dt><dd className="break-all text-slate-200">{v}</dd></div>)}</dl>
              <div className="mt-6 rounded-xl border border-brand/30 bg-brand/5 p-4"><p className="mb-1 flex items-center gap-2 text-sm font-medium text-brand-soft"><Lightbulb className="h-4 w-4" />Suggested fix</p><p className="text-sm text-slate-300">{sel.suggestion}</p><p className="mt-2 text-xs text-slate-500">Static suggestion in Part 1. AI-generated diagnosis arrives in Part 2.</p></div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
