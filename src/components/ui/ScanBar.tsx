/** Mechanical progress bar: ticked track, moving fill, laser edge. */
export default function ScanBar({ percent, label }: { percent: number; label?: string }) {
  return (
    <div role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label={label ?? 'Scan progress'}>
      <div className="relative h-3 overflow-hidden rounded-md border border-edge bg-ink">
        <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #1E2B4A 0 1px, transparent 1px 10px)' }} />
        <div className="relative h-full rounded-sm bg-gradient-to-r from-brand-deep to-brand transition-[width] duration-300" style={{ width: `${percent}%` }}>
          <span className="absolute right-0 top-0 h-full w-0.5 bg-white shadow-[0_0_10px_3px_rgba(165,180,252,.9)]" />
        </div>
      </div>
    </div>
  );
}
