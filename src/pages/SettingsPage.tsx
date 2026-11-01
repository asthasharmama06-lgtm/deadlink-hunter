import { useEffect, useState } from 'react';
import Button from '../components/common/Button';

const KEY = 'deadlink-hunter:settings';
const DEFAULTS = { maxDepth: 3, timeoutMs: 10000, slowMs: 3000, checkExternal: true, followRedirects: true };
type Settings = typeof DEFAULTS;

function load(): Settings {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }; } catch { return DEFAULTS; }
}

export default function SettingsPage() {
  const [s, setS] = useState<Settings>(load);
  const [saved, setSaved] = useState(false);
  useEffect(() => { if (saved) { const t = setTimeout(() => setSaved(false), 1800); return () => clearTimeout(t); } }, [saved]);
  const num = (k: 'maxDepth' | 'timeoutMs' | 'slowMs', label: string, hint: string) => (
    <label className="block"><span className="text-sm font-medium">{label}</span><span className="mb-1.5 block text-xs text-slate-500">{hint}</span><input type="number" min={1} className="field max-w-xs" value={s[k]} onChange={(e) => setS({ ...s, [k]: Math.max(1, Number(e.target.value) || 1) })} /></label>
  );
  const toggle = (k: 'checkExternal' | 'followRedirects', label: string) => (
    <label className="flex cursor-pointer items-center gap-3 text-sm"><input type="checkbox" className="h-4 w-4 accent-[#7C8CFF]" checked={s[k]} onChange={(e) => setS({ ...s, [k]: e.target.checked })} />{label}</label>
  );
  return (
    <div className="card max-w-xl space-y-6 p-6">
      {num('maxDepth', 'Crawl depth', 'How many link levels to follow from the start page.')}
      {num('timeoutMs', 'Request timeout (ms)', 'Links slower than this are reported as timeouts.')}
      {num('slowMs', 'Slow threshold (ms)', 'Links slower than this are flagged as slow.')}
      <div className="space-y-3">{toggle('checkExternal', 'Check external links')}{toggle('followRedirects', 'Follow redirects')}</div>
      <div className="flex items-center gap-3">
        <Button onClick={() => { localStorage.setItem(KEY, JSON.stringify(s)); setSaved(true); }}>Save settings</Button>
        <Button variant="ghost" onClick={() => { setS(DEFAULTS); localStorage.removeItem(KEY); }}>Reset to defaults</Button>
        <span role="status" className="text-sm text-ok">{saved && 'Settings saved'}</span>
      </div>
      <p className="text-xs text-slate-500">Saved in this browser only. These values are sent to the backend in Part 2.</p>
    </div>
  );
}
