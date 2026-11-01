import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Lock, ScanSearch, X } from 'lucide-react';
import TextDropHero from '../components/animations/TextDropHero';
import MechanicalScanner from '../components/animations/MechanicalScanner';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import ScanBar from '../components/ui/ScanBar';
import { useScan } from '../hooks/useScan';
import { getScanHistory } from '../services/scanService';
import type { ScanJob } from '../types/scan';
import { hostOf, timeAgo } from '../utils/formatters';
import { validateUrl } from '../utils/validators';

export default function HomePage() {
const [url, setUrl] = useState('');
const [err, setErr] = useState<string | null>(null);
const [recentScans, setRecentScans] = useState<ScanJob[]>([]);
const { job, running, error, start, cancel, reset } = useScan();

useEffect(() => {
let active = true;


const loadHistory = async () => {
  try {
    const scans = await getScanHistory();
    if (active) {
      setRecentScans(scans.slice(0, 4));
    }
  } catch (error) {
    console.error('Failed to load scan history:', error);
  }
};

void loadHistory();

return () => {
  active = false;
};


}, [job]);

const submit = () => {
const problem = validateUrl(url);
setErr(problem);


if (!problem) {
  start(url.trim());
}


};

return ( <div className="space-y-10"> <section className="relative overflow-hidden rounded-3xl border border-edge bg-base/60 px-6 py-12 sm:px-12 sm:py-16"> <MechanicalScanner
       size={420}
       className="pointer-events-none absolute -right-24 -top-16 hidden opacity-70 md:block"
     />


    <div className="laser-line pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand to-transparent" />

    <div className="relative max-w-2xl">
      <p className="mb-4 font-display text-sm text-brand-soft">
        Detect. Diagnose. Fix.
      </p>

      <TextDropHero
        text="Your website's health, decoded."
        className="font-display text-4xl font-bold leading-tight sm:text-6xl"
      />

      <p className="mt-5 max-w-lg text-slate-400">
        Paste a website address. DeadLink Hunter checks every link,
        explains what broke, and tells you how to fix it.
      </p>

      <div className="card-glow mt-8 p-4 sm:p-5">
        <label
          htmlFor="url"
          className="mb-2 block text-sm font-medium text-slate-300"
        >
          Website to scan
        </label>

        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="url"
            className="field"
            value={url}
            disabled={running}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="https://example.com"
            inputMode="url"
            aria-invalid={!!err}
            aria-describedby="url-err"
          />

          {running ? (
            <Button variant="danger" onClick={cancel}>
              <X className="h-4 w-4" />
              Cancel
            </Button>
          ) : (
            <Button onClick={submit}>
              <ScanSearch className="h-4 w-4" />
              Scan site
            </Button>
          )}
        </div>

        <p
          id="url-err"
          className="mt-2 min-h-5 text-sm text-bad"
          role="alert"
        >
          {err ?? error}
        </p>

        {job && job.status === 'running' && job.progress && (
          <div className="mt-2 space-y-2">
            <ScanBar percent={job.progress.percent} />
            <p className="flex justify-between text-xs text-slate-400">
              <span>Checking {job.progress.currentUrl}</span>
              <span className="tabular-nums">
                {job.progress.linksChecked} / {job.progress.linksFound} links
              </span>
            </p>
          </div>
        )}

        {job?.status === 'completed' && (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ok/30 bg-ok/5 p-3 text-sm">
            <span>
              Scan finished for {hostOf(job.url)}: score{' '}
              <b>{job.summary?.healthScore ?? 'N/A'}</b>.
            </span>

            <span className="flex gap-2">
              <Link to={`/scan/${job.id}`}>
                <Button>View results</Button>
              </Link>
              <Button variant="ghost" onClick={reset}>
                New scan
              </Button>
            </span>
          </div>
        )}

        {job?.status === 'failed' && (
          <p className="mt-2 text-sm text-bad">
            Scan failed: {job.error || 'An unexpected error occurred.'}
          </p>
        )}

        {job?.status === 'cancelled' && (
          <p className="mt-2 text-sm text-warn">Scan cancelled.</p>
        )}
      </div>
    </div>
  </section>

  <section className="grid gap-6">
    <div className="w-full">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold">
          Recent scans
        </h3>
        <Badge tone="brand">Scan history</Badge>
      </div>

      <div className="card divide-y divide-edge/60">
        {recentScans.length === 0 ? (
          <p className="px-4 py-5 text-sm text-slate-500">
            No scans yet. Scan a website to see its history here.
          </p>
        ) : (
          recentScans.map((scan) => (
            <Link
              key={scan.id}
              to={`/scan/${scan.id}`}
              className="group flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-panel/60"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {hostOf(scan.url)}
                </p>
                <p className="text-xs text-slate-500">
                  {timeAgo(scan.startedAt)}
                </p>
              </div>

              <ArrowRight className="h-4 w-4 text-slate-600 transition group-hover:translate-x-1 group-hover:text-brand-soft" />
            </Link>
          ))
        )}
      </div>

      <p className="mt-4 flex gap-2 text-xs leading-relaxed text-slate-500">
        <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Scans are processed by the connected backend. Results depend on
        website availability and scanning permissions.
      </p>
    </div>
  </section>
</div>


);
}

