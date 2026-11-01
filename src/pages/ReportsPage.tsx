import { useEffect, useMemo, useState } from 'react';
import Badge from '../components/common/Badge';
import LoadingState from '../components/common/LoadingState';
import { getScanHistory } from '../services/scanService';
import { hasBackend, http } from '../services/api';
import type { ScanJob } from '../types/scan';

type SeoCheck = {
  key: string;
  label: string;
  status: 'passed' | 'issue';
  points: number;
  maxPoints: number;
  details: string;
  recommendation: string;
};
type SeoPage = { pageUrl: string; score: number; issues: number; checks: SeoCheck[]; checkedAt: string };
type Report = {
  scanId: string;
  url: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  health: { healthScore: number; totalLinks: number; healthy: number; broken: number; redirects: number; slow: number; pagesScanned: number } | null;
  seo: { score: number; pagesAudited: number; checksPassed: number; checksWithIssues: number; pages: SeoPage[] };
};

function ScoreCard({ label, score, note }: { label: string; score: number; note: string }) {
  return <section className="card p-5">
    <p className="text-sm text-slate-400">{label}</p>
    <p className="mt-2 text-4xl font-semibold">{score}<span className="text-lg text-slate-500">/100</span></p>
    <p className="mt-2 text-xs text-slate-400">{note}</p>
  </section>;
}

export default function ReportsPage() {
  const [scans, setScans] = useState<ScanJob[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getScanHistory().then((items) => {
      const completed = items.filter((scan) => scan.status === 'completed');
      setScans(completed);
      if (completed.length) setSelectedId(completed[0].id);
    }).catch((e: unknown) => setError(e instanceof Error ? e.message : 'Could not load scan history.'));
  }, []);

  useEffect(() => {
    if (!selectedId || !hasBackend) { setReport(null); return; }
    let active = true;
    setLoading(true); setError(''); setReport(null);
    http<Report>(`/api/scans/${encodeURIComponent(selectedId)}/report`)
      .then((result) => { if (active) setReport(result); })
      .catch((e: unknown) => { if (active) setError(e instanceof Error ? e.message : 'Could not load report.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [selectedId]);

  const issuePages = useMemo(() => report?.seo.pages ?? [], [report]);

  if (!hasBackend) return <div className="card p-6">
    <h2 className="text-xl font-semibold">Website Health &amp; SEO Report</h2>
    <p className="mt-2 text-sm text-slate-400">Connect the FastAPI backend to generate reports from real website scans. Demo scans do not contain SEO audit data.</p>
  </div>;

  return <div className="space-y-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div><h1 className="text-2xl font-semibold">Website Health &amp; SEO Report</h1>
        <p className="mt-1 text-sm text-slate-400">Link health and on-page SEO findings from one completed scan.</p></div>
      <label className="w-full sm:max-w-md"><span className="mb-1 block text-xs text-slate-400">Select completed scan</span>
        <select className="field" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
          <option value="">Choose a scan</option>
          {scans.map((scan) => <option key={scan.id} value={scan.id}>{scan.url} — {new Date(scan.startedAt).toLocaleString()}</option>)}
        </select>
      </label>
    </div>

    {loading && <LoadingState label="Preparing website report…" />}
    {error && <div className="card border-bad/40 p-4 text-sm text-bad">{error}</div>}
    {!loading && !error && scans.length === 0 && <div className="card p-6 text-sm text-slate-400">No completed scans yet. Run a website scan first.</div>}
    {!loading && !error && selectedId && !report && <div className="card p-6 text-sm text-slate-400">The report is not available for this scan yet.</div>}

    {report && <>
      <div className="card flex flex-col gap-1 p-4"><p className="break-all font-medium">{report.url}</p>
        <p className="text-xs text-slate-400">Scanned {report.finishedAt ? new Date(report.finishedAt).toLocaleString() : '—'} · {report.seo.pagesAudited} pages audited</p></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <ScoreCard label="Website Health Score" score={report.health?.healthScore ?? 0} note={`${report.health?.broken ?? 0} broken · ${report.health?.redirects ?? 0} redirects · ${report.health?.slow ?? 0} slow`} />
        <ScoreCard label="SEO Benchmark Score" score={report.seo.score} note={`${report.seo.checksPassed} checks passed · ${report.seo.checksWithIssues} findings`} />
      </div>
      <section className="card p-5">
        <h2 className="text-lg font-semibold">Link health summary</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[['Total links', report.health?.totalLinks ?? 0], ['Healthy', report.health?.healthy ?? 0], ['Broken', report.health?.broken ?? 0], ['Pages scanned', report.health?.pagesScanned ?? 0]].map(([label, value]) =>
            <div key={String(label)} className="rounded-xl border border-edge p-3"><p className="text-xs text-slate-400">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div>)}
        </div>
      </section>
      <section className="space-y-4">
        <div><h2 className="text-lg font-semibold">Page-by-page SEO findings</h2><p className="text-sm text-slate-400">Checks are based on the HTML returned during this scan; they do not predict Google rankings.</p></div>
        {issuePages.map((page) => <article key={page.pageUrl} className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="max-w-full break-all text-sm font-medium">{page.pageUrl}</h3>
            <Badge tone={page.score >= 80 ? 'ok' : page.score >= 60 ? 'warn' : 'bad'}>SEO {page.score}/100</Badge></div>
          <div className="mt-4 space-y-3">
            {page.checks.map((check) => <div key={check.key} className="border-t border-edge pt-3">
              <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-medium">{check.label}</p><Badge tone={check.status === 'passed' ? 'ok' : 'warn'}>{check.status === 'passed' ? 'Passed' : 'Needs attention'}</Badge></div>
              <p className="mt-1 text-xs text-slate-400">{check.details}</p>
              {check.recommendation && <p className="mt-1 text-xs text-slate-300">Recommendation: {check.recommendation}</p>}
            </div>)}
          </div>
        </article>)}
      </section>
    </>}
  </div>;
}
