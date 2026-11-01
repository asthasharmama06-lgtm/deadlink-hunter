import { useState } from 'react';
import { SendHorizonal } from 'lucide-react';

export default function ChatInput({ onSend, disabled }: { onSend: (text: string) => void; disabled?: boolean }) {
  const [value, setValue] = useState('');
  const submit = () => {
    const v = value.trim();
    if (!v || disabled) return;
    onSend(v);
    setValue('');
  };
  return (
    <div className="flex items-center gap-2">
      <input className="field" value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} placeholder="Ask about your links, or paste a URL…" aria-label="Message" />
      <button onClick={submit} disabled={disabled || !value.trim()} aria-label="Send" className="rounded-xl bg-brand p-3 text-ink transition hover:bg-brand-soft active:scale-95 disabled:opacity-40"><SendHorizonal className="h-4 w-4" /></button>
    </div>
  );
}
