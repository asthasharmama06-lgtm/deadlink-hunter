import type { LucideIcon } from 'lucide-react';
import Card from '../ui/Card';

const tone = { ok: 'text-ok bg-ok/10', warn: 'text-warn bg-warn/10', bad: 'text-bad bg-bad/10', brand: 'text-brand-soft bg-brand/10' };

export default function StatCard({ label, value, hint, icon: Icon, color = 'brand' }: { label: string; value: string | number; hint?: string; icon: LucideIcon; color?: keyof typeof tone }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <p className="text-sm text-slate-400">{label}</p>
        <span className={`rounded-lg p-2 ${tone[color]}`}><Icon className="h-4 w-4" /></span>
      </div>
      <p className="mt-3 font-display text-3xl font-bold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </Card>
  );
}
