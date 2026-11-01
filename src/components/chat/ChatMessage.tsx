import { motion } from 'framer-motion';
import { Bot, Info, User } from 'lucide-react';
import type { ChatMessageModel } from '../../types/chat';
import ScanBar from '../ui/ScanBar';

export const TypingDots = () => (
  <div className="flex items-center gap-1 py-1" aria-label="Assistant is typing" role="status">
    {[0, 1, 2].map((i) => <span key={i} className="typing-dot h-1.5 w-1.5 rounded-full bg-brand-soft" />)}
  </div>
);

export default function ChatMessage({ message, typing = false }: { message: ChatMessageModel; typing?: boolean }) {
  const { role, content, progress } = message;
  if (role === 'system') {
    return <div className="flex items-center justify-center gap-1.5 py-1 text-xs text-slate-500"><Info className="h-3 w-3" />{content}</div>;
  }
  const mine = role === 'user';
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 24 }} className={`flex gap-2.5 ${mine ? 'flex-row-reverse' : ''}`}>
      <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${mine ? 'bg-brand/20 text-brand-soft' : 'bg-panel text-ok'}`}>{mine ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}</div>
      <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${mine ? 'bg-brand/15 text-slate-100' : 'border border-edge bg-panel text-slate-200'}`}>
        {typing ? <TypingDots /> : role === 'progress' ? (
          <div className="w-56 space-y-2 sm:w-72"><p>{content}</p><ScanBar percent={progress ?? 0} /><p className="text-xs text-slate-500">{progress ?? 0}% complete</p></div>
        ) : content}
      </div>
    </motion.div>
  );
}
