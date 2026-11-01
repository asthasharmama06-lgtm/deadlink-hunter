import type { ReactNode } from 'react';
import { SearchX } from 'lucide-react';

export default function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <SearchX className="h-9 w-9 text-slate-600" />
      <p className="font-display text-lg font-semibold text-slate-200">{title}</p>
      {hint && <p className="max-w-sm text-sm text-slate-400">{hint}</p>}
      {action}
    </div>
  );
}
