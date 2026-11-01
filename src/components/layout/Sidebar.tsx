import { NavLink } from 'react-router-dom';
import { BarChart3, FileText, History, Home, Settings, Radar } from 'lucide-react';

export const navItems = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { to: '/history', label: 'History', icon: History },
  { to: '/reports', label: 'Reports', icon: FileText },
  { to: '/settings', label: 'Settings', icon: Settings }
];

export default function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-edge bg-ink/90 p-4 backdrop-blur lg:flex">
      <div className="mb-8 flex items-center gap-2.5 px-2">
        <Radar className="h-6 w-6 text-brand" />
        <span className="font-display text-lg font-bold tracking-tight">DeadLink Hunter</span>
      </div>
      <nav className="flex flex-col gap-1" aria-label="Primary">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${isActive ? 'bg-brand/15 text-brand-soft' : 'text-slate-400 hover:bg-panel hover:text-slate-100'}`}
          >
            <Icon className="h-4 w-4" /> {label}
          </NavLink>
        ))}
      </nav>
      <p className="mt-auto px-2 font-display text-sm text-slate-500">Detect. Diagnose. Fix.</p>
    </aside>
  );
}
