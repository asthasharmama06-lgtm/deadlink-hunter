import { DEMO_ORIGIN, DEMO_TOTAL_LINKS, demoIssues, demoScans } from '../data/demoData';
import type { LinkIssue, ScanJob, ScanRequest, ScanSummary } from '../types/scan';
import { hasBackend, http } from './api';
const MOCK_DURATION_MS = 6000;
const PATHS = ['/', '/about', '/pricing', '/blog', '/products', '/docs', '/contact', '/faq'];

const live = new Map<string, ScanJob>();

const wait = (ms = 250) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function summarize(issues: LinkIssue[], total: number): ScanSummary {
const broken = issues.filter((issue) =>
['broken', 'server-error', 'timeout'].includes(issue.category),
).length;

const redirects = issues.filter((issue) => issue.category === 'redirect').length;
const slow = issues.filter((issue) => issue.category === 'slow').length;

const healthScore = Math.max(
0,
Math.min(100, Math.round(100 - broken * 2.5 - redirects * 0.8 - slow * 0.6)),
);

return {
totalLinks: total,
healthy: Math.max(0, total - broken - redirects - slow),
broken,
redirects,
slow,
healthScore,
};
}

function hydrate(job: ScanJob): ScanJob {
if (job.status !== 'running' || job.isDemo) {
return job;
}

const elapsed = Date.now() - new Date(job.startedAt).getTime();
const percent = Math.min(100, Math.round((elapsed / MOCK_DURATION_MS) * 100));

if (percent >= 100) {
const completed: ScanJob = {
...job,
status: 'completed',
finishedAt: new Date().toISOString(),
progress: undefined,
summary: summarize(demoIssues, DEMO_TOTAL_LINKS),
};


live.set(job.id, completed);
return completed;


}

return {
...job,
progress: {
scanId: job.id,
percent,
currentUrl: PATHS[Math.floor(percent / 12.5) % PATHS.length],
linksChecked: Math.round(percent * 2.4),
linksFound: DEMO_TOTAL_LINKS,
},
};
}

export async function startScan(req: ScanRequest): Promise<ScanJob> {
if (hasBackend) {
return http<ScanJob>('/api/scans', {
method: 'POST',
body: JSON.stringify(req),
});
}

// Demo mode is used only when no backend URL is configured.
await wait();

const job: ScanJob = {
id: `scan-${Date.now().toString(36)}`,
url: req.url,
status: 'running',
startedAt: new Date().toISOString(),
};

live.set(job.id, job);
return hydrate(job);
}

export async function getScan(id: string): Promise<ScanJob> {
if (hasBackend) {
return http<ScanJob>(`/api/scans/${encodeURIComponent(id)}`);
}

const job = live.get(id) ?? demoScans.find((scan) => scan.id === id);

if (!job) {
throw new Error('Scan not found');
}

return hydrate(job);
}

export async function getScanResults(id: string): Promise<LinkIssue[]> {
if (hasBackend) {
return http<LinkIssue[]>(`/api/scans/${encodeURIComponent(id)}/results`);
}

await wait(150);

const job = await getScan(id);
let origin = DEMO_ORIGIN;

try {
origin = new URL(job.url).origin;
} catch {
// Keep the demo origin if the URL is invalid.
}

return demoIssues.map((issue) => ({
...issue,
scanId: id,
url: issue.url.replace(DEMO_ORIGIN, origin),
sourcePage: issue.sourcePage.replace(DEMO_ORIGIN, origin),
}));
}

export async function getScanHistory(): Promise<ScanJob[]> {
if (hasBackend) {
return http<ScanJob[]>('/api/scans');
}

await wait(150);

return [
...[...live.values()].map(hydrate),
...demoScans,
].sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
}

export async function cancelScan(id: string): Promise<void> {
if (hasBackend) {
await http<void>(`/api/scans/${encodeURIComponent(id)}/cancel`, {
method: 'POST',
});
return;
}

const job = live.get(id);

if (job) {
live.set(id, {
...job,
status: 'cancelled',
progress: undefined,
});
}
}
