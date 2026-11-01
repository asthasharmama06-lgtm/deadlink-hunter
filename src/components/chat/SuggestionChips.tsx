const DEFAULTS = ['Find broken links', 'Analyze redirects', 'Check slow pages', 'Explain a 404'];

export default function SuggestionChips({ onPick, items = DEFAULTS }: { onPick: (text: string) => void; items?: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((s) => (
        <button key={s} onClick={() => onPick(s)} className="rounded-full border border-edge bg-panel px-3.5 py-1.5 text-sm text-slate-300 transition hover:scale-[1.03] hover:border-brand hover:text-brand-soft active:scale-95">
          {s}
        </button>
      ))}
    </div>
  );
}
