import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ChatMessageModel } from '../../types/chat';
import { findUrl, isValidUrl } from '../../utils/validators';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import SuggestionChips from './SuggestionChips';

const mk = (role: ChatMessageModel['role'], content: string, progress?: number): ChatMessageModel => ({ id: crypto.randomUUID(), role, content, progress, createdAt: new Date().toISOString() });

const REPLIES: Record<string, string> = {
  'find broken links': 'A broken link returns 404 or 5xx. Scan a site above and I’ll list each one with the page it sits on and a suggested fix. (Mock reply — live AI arrives in Part 2.)',
  'analyze redirects': 'Redirects (301/302/308) add latency and can chain. I’ll flag chains longer than two hops and suggest linking to the final URL. (Mock reply.)',
  'check slow pages': 'Pages above your slow threshold (default 3 s, see Settings) are reported as “slow”, with the asset most likely to blame. (Mock reply.)',
  'explain a 404': 'A 404 means the server is reachable but the page isn’t there. Common causes: renamed slug, deleted page, typo in the href. (Mock reply.)'
};

export default function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessageModel[]>([
    mk('system', 'Demo assistant — responses are mocked in Part 1'),
    mk('assistant', 'Hi! I can scan a site for dead links and explain what I find. Paste a URL or pick a suggestion.')
  ]);
  const [typing, setTyping] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
  end.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}, [messages, typing]);
  const send = (text: string) => {
    setMessages((m) => [...m, mk('user', text)]);
    const url = findUrl(text);
    setTyping(true);
    if (url && isValidUrl(url)) {
      setTimeout(() => {
        setTyping(false);
        const p = mk('progress', `Scanning ${url}`, 0);
        setMessages((m) => [...m, p]);
        let pct = 0;
        const t = setInterval(() => {
          pct = Math.min(100, pct + 10);
          setMessages((m) => m.map((x) => (x.id === p.id ? { ...x, progress: pct } : x)));
          if (pct === 100) {
            clearInterval(t);
            setMessages((m) => [...m, mk('assistant', 'Scan finished: 240 links checked, 7 broken, 4 redirects. These are demo results.')]);
            setDone('scan-1001');
          }
        }, 350);
      }, 700);
      return;
    }
    setTimeout(() => {
      setTyping(false);
      setMessages((m) => [...m, mk('assistant', REPLIES[text.toLowerCase()] ?? 'In Part 1 I only answer a few canned questions. Try one of the suggestions below.')]);
    }, 900);
  };

  return (
    <div className="card flex h-[420px] flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
        {messages.map((m) => <ChatMessage key={m.id} message={m} />)}
        {typing && <ChatMessage message={mk('assistant', '')} typing />}
        {done && <Link to={`/scan/${done}`} className="inline-block text-sm text-brand-soft underline underline-offset-4">Open demo results</Link>}
        <div ref={end} />
      </div>
      <div className="space-y-3 border-t border-edge p-3">
        <SuggestionChips onPick={send} />
        <ChatInput onSend={send} disabled={typing} />
      </div>
    </div>
  );
}
