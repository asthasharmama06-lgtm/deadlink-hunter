import type { IssueSeverity, ScanStatus } from '../types/scan';

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export const formatMs = (ms: number) => (ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${ms} ms`);

export function timeAgo(iso: string): string {
  const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

export const hostOf = (url: string) => {
  try { return new URL(url).host; } catch { return url; }
};

export const scoreTone = (score: number) => (score >= 85 ? 'ok' : score >= 65 ? 'warn' : 'bad');
export const scoreHex = (score: number) => ({ ok: '#34D399', warn: '#FBBF24', bad: '#F87171' })[scoreTone(score)];

export const statusLabel: Record<ScanStatus, string> = {
  queued: 'Queued', running: 'In progress', completed: 'Completed', failed: 'Failed', cancelled: 'Cancelled'
};
export const severityLabel: Record<IssueSeverity, string> = { critical: 'Critical', warning: 'Warning', info: 'Info' };
