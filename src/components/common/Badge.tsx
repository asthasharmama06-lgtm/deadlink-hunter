import type { ReactNode } from 'react';

export type Tone = 'ok' | 'warn' | 'bad' | 'brand' | 'neutral';
const tones: Record<Tone, string> = {
  ok: 'bg-ok/10 text-ok border-ok/30',
  warn: 'bg-warn/10 text-warn border-warn/30',
  bad: 'bg-bad/10 text-bad border-bad/30',
  brand: 'bg-brand/10 text-brand-soft border-brand/30',
  neutral: 'bg-panel text-slate-400 border-edge'
};
const dots: Record<Tone, string> = { ok: 'bg-ok', warn: 'bg-warn', bad: 'bg-bad', brand: 'bg-brand', neutral: 'bg-slate-500' };

export default function Badge({ tone = 'neutral', pulse = false, children }: { tone?: Tone; pulse?: boolean; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>
      <span className="relative flex h-1.5 w-1.5">
        {pulse && <span className={`status-ping absolute inset-0 rounded-full ${dots[tone]}`} />}
        <span className={`relative h-1.5 w-1.5 rounded-full ${dots[tone]}`} />
      </span>
      {children}
    </span>
  );
}
