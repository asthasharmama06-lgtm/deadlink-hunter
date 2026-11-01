function gearPath(teeth: number, outer: number, inner: number): string {
  const n = teeth * 4;
  const pts = Array.from({ length: n }, (_, i) => {
    const a = ((i - 0.5) / n) * Math.PI * 2;
    const r = i % 4 < 2 ? outer : inner;
    return `${(Math.cos(a) * r).toFixed(2)} ${(Math.sin(a) * r).toFixed(2)}`;
  });
  return `M${pts.join('L')}Z`;
}

const BIG = gearPath(14, 46, 38);
const SMALL = gearPath(9, 30, 24);

interface Props { size?: number; active?: boolean; className?: string }

/** Rotating gears + radar sweep. Pure SVG + CSS keyframes (respects prefers-reduced-motion). */
export default function MechanicalScanner({ size = 220, active = true, className = '' }: Props) {
  const fast = active ? 'gear-fast' : '';
  return (
    <svg viewBox="-100 -100 200 200" width={size} height={size} className={className} role="img" aria-label="Diagnostic scanner animation">
      <defs>
        <linearGradient id="sweep" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#7C8CFF" stopOpacity=".55" />
          <stop offset="1" stopColor="#7C8CFF" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[90, 66, 42].map((r) => <circle key={r} r={r} fill="none" stroke="#1E2B4A" strokeWidth="1" strokeDasharray={r === 66 ? '3 5' : undefined} />)}
      <path d="M-100 0H100M0 -100V100" stroke="#1E2B4A" strokeWidth=".6" />
      <g className="radar-sweep"><path d="M0 0 L-24 -88 A92 92 0 0 1 24 -88Z" fill="url(#sweep)" /></g>
      <g transform="translate(-30 20)"><path className={`gear-cw ${fast}`} d={BIG} fill="#111B33" stroke="#7C8CFF" strokeWidth="1.5" /><circle r="12" fill="none" stroke="#7C8CFF" strokeWidth="1.5" /></g>
      <g transform="translate(34 -18)"><path className={`gear-ccw ${fast}`} d={SMALL} fill="#111B33" stroke="#34D399" strokeWidth="1.5" /><circle r="8" fill="none" stroke="#34D399" strokeWidth="1.5" /></g>
      {[[-62, -52, '#34D399'], [58, 44, '#F87171'], [20, 66, '#FBBF24']].map(([x, y, c], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <circle r="3" fill={c as string} />
          <circle r="5" fill="none" stroke={c as string} className="status-ping" style={{ animationDelay: `${i * 0.6}s`, transformBox: 'fill-box', transformOrigin: 'center' }} />
        </g>
      ))}
    </svg>
  );
}
