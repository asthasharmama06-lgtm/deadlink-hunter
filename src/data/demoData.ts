import type { IssueCategory, LinkIssue, ScanJob } from '../types/scan';

export const DEMO_ORIGIN = 'https://demo-shop.dev';
const ago = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

// [path, source, anchor, status, category, ms, suggestion]
type Row = [string, string, string, number, IssueCategory, number, string];
const rows: Row[] = [
  ['/blog/summer-sale-2023', '/', 'Summer sale', 404, 'broken', 180, 'Page was removed. Redirect to /sale or update the link.'],
  ['/docs/api/v1', '/developers', 'API reference', 404, 'broken', 210, 'Docs moved to /docs/api/v2. Update the link target.'],
  ['/team/jordan', '/about', 'Jordan', 404, 'broken', 160, 'Profile no longer exists. Remove the link.'],
  ['/assets/brochure.pdf', '/pricing', 'Download brochure', 404, 'broken', 140, 'File missing from storage. Re-upload or remove.'],
  ['/checkout/legacy', '/cart', 'Old checkout', 500, 'server-error', 920, 'Server error on this route. Check application logs.'],
  ['/api/search?q=', '/search', 'Search', 503, 'server-error', 1500, 'Service unavailable. Check upstream health.'],
  ['/products/old-chair', '/category/furniture', 'Oak chair', 301, 'redirect', 120, 'Permanent redirect. Link to the final URL directly.'],
  ['/products/lamp', '/category/lighting', 'Desk lamp', 302, 'redirect', 130, 'Temporary redirect. Confirm it should not be permanent.'],
  ['/contact-us', '/footer', 'Contact', 301, 'redirect', 95, 'Redirects to /contact. Update internal links.'],
  ['/shipping', '/faq', 'Shipping info', 308, 'redirect', 110, 'Permanent redirect. Update the link.'],
  ['/media/hero-video.mp4', '/', 'Watch the film', 200, 'slow', 4800, 'Large asset. Compress or lazy-load it.'],
  ['/reviews', '/products/desk', 'Reviews', 200, 'slow', 3200, 'Slow response. Cache or paginate this page.'],
  ['https://partner-cdn.example/logo.png', '/partners', 'Partner logo', 0, 'timeout', 10000, 'Request timed out. Host may be down.'],
  ['https://old-blog.example/post/12', '/press', 'Press coverage', 404, 'broken', 340, 'External page is gone. Replace with an archived copy.']
];

export const demoIssues: LinkIssue[] = rows.map(([path, src, anchor, code, category, ms, suggestion], i) => ({
  id: `iss-${i + 1}`,
  scanId: 'scan-1001',
  url: path.startsWith('http') ? path : DEMO_ORIGIN + path,
  sourcePage: DEMO_ORIGIN + src,
  anchorText: anchor,
  statusCode: code,
  category,
  severity: category === 'broken' || category === 'server-error' || category === 'timeout' ? 'critical' : category === 'redirect' ? 'warning' : 'info',
  responseMs: ms,
  suggestion,
  checkedAt: ago(2)
}));

export const DEMO_TOTAL_LINKS = 240;

export const demoScans: ScanJob[] = [
  { id: 'scan-1001', url: DEMO_ORIGIN, status: 'completed', startedAt: ago(2), finishedAt: ago(1.9), isDemo: true, summary: { totalLinks: 240, healthy: 226, broken: 7, redirects: 4, slow: 2, healthScore: 82 } },
  { id: 'scan-1002', url: 'https://docs.acme-labs.io', status: 'completed', startedAt: ago(26), finishedAt: ago(25.8), isDemo: true, summary: { totalLinks: 612, healthy: 601, broken: 3, redirects: 6, slow: 2, healthScore: 94 } },
  { id: 'scan-1003', url: 'https://blog.northwind.app', status: 'completed', startedAt: ago(50), finishedAt: ago(49.7), isDemo: true, summary: { totalLinks: 388, healthy: 331, broken: 31, redirects: 18, slow: 8, healthScore: 58 } },
  { id: 'scan-1004', url: 'https://portfolio.astro.dev', status: 'running', startedAt: ago(0.05), isDemo: true, progress: { scanId: 'scan-1004', percent: 64, currentUrl: '/projects/gallery', linksChecked: 96, linksFound: 150 } },
  { id: 'scan-1005', url: 'https://intranet.local-corp.net', status: 'failed', startedAt: ago(73), isDemo: true },
  { id: 'scan-1006', url: 'https://shop.kiteworks.co', status: 'completed', startedAt: ago(120), finishedAt: ago(119.6), isDemo: true, summary: { totalLinks: 905, healthy: 880, broken: 9, redirects: 12, slow: 4, healthScore: 91 } }
];

export const demoTrend = [
  { day: 'Mon', score: 71, broken: 22 }, { day: 'Tue', score: 74, broken: 19 }, { day: 'Wed', score: 73, broken: 20 },
  { day: 'Thu', score: 79, broken: 14 }, { day: 'Fri', score: 83, broken: 11 }, { day: 'Sat', score: 82, broken: 12 }, { day: 'Sun', score: 88, broken: 8 }
];
