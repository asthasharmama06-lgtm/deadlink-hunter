import MechanicalScanner from '../animations/MechanicalScanner';

export default function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-14" role="status" aria-live="polite">
      <MechanicalScanner size={96} />
      <p className="text-sm text-slate-400">{label}</p>
    </div>
  );
}
