import { scoreHex } from '../../utils/formatters';
import Card from '../ui/Card';

export default function HealthScoreCard({ score, title = 'Health score', note }: { score: number; title?: string; note?: string }) {
  const r = 52, c = 2 * Math.PI * r;
  return (
    <Card className="flex items-center gap-5 p-5">
      <svg viewBox="0 0 120 120" className="h-28 w-28 shrink-0 -rotate-90" role="img" aria-label={`${title}: ${score} out of 100`}>
        <circle cx="60" cy="60" r={r} fill="none" stroke="#1E2B4A" strokeWidth="9" strokeDasharray="2 4" />
        <circle cx="60" cy="60" r={r} fill="none" stroke={scoreHex(score)} strokeWidth="9" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} style={{ transition: 'stroke-dashoffset .9s cubic-bezier(.2,.8,.2,1)' }} />
        <text x="60" y="68" textAnchor="middle" className="rotate-90 fill-slate-100 font-display text-3xl font-bold" style={{ transformOrigin: '60px 60px' }}>{score}</text>
      </svg>
      <div><p className="text-sm text-slate-400">{title}</p><p className="font-display text-xl font-semibold">{score >= 85 ? 'Healthy' : score >= 65 ? 'Needs attention' : 'Critical'}</p>{note && <p className="mt-1 text-xs text-slate-500">{note}</p>}</div>
    </Card>
  );
}
