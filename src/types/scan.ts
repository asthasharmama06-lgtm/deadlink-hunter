export type ScanStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export type IssueSeverity = 'critical' | 'warning' | 'info';

export type IssueCategory =
| 'broken'
| 'server-error'
| 'missing-image'
| 'redirect'
| 'slow'
| 'timeout'
| 'dns'
| 'connection'
| 'tls'
| 'blocked'
| 'rate-limited';

export interface ScanRequest {
url: string;
maxPages?: number;
maxDepth?: number;
checkExternal?: boolean;
checkImages?: boolean;
timeoutMs?: number;
slowMs?: number;
}

export interface ScanProgress {
scanId: string;
percent: number;
currentUrl: string;
linksChecked: number;
linksFound: number;
pagesScanned?: number;
issuesFound?: number;
}

export interface ScoreBreakdown {
formula: string;
evaluated: number;
weightedProblems: number;
excludedBlocked: number;
excludedRateLimited: number;
}

export interface ScanSummary {
totalLinks: number;
healthy: number;
broken: number;
redirects: number;
slow: number;
healthScore: number;
pagesScanned?: number;
imagesChecked?: number;
brokenImages?: number;
timeouts?: number;
blocked?: number;
rateLimited?: number;
scoreBreakdown?: ScoreBreakdown;
}

export interface ScanJob {
id: string;
url: string;
status: ScanStatus;
startedAt: string;
finishedAt?: string | null;
error?: string | null;
summary?: ScanSummary | null;
progress?: ScanProgress | null;
isDemo?: boolean;
}

export interface LinkIssue {
id: string;
scanId: string;
url: string;
sourcePage: string;
anchorText: string;
statusCode: number;
category: IssueCategory;
severity: IssueSeverity;
responseMs: number;
suggestion: string;
checkedAt: string;
kind?: 'link' | 'image';
message?: string;
redirectChain?: string[];
}
