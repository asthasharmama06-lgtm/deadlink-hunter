import { NavLink } from 'react-router-dom';
import { navItems } from './Sidebar';

export default function MobileNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-edge bg-ink/95 backdrop-blur lg:hidden" aria-label="Mobile">
      {navItems.map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `flex flex-col items-center gap-1 py-2.5 text-[11px] ${isActive ? 'text-brand-soft' : 'text-slate-500'}`}>
          <Icon className="h-5 w-5" /> {label}
        </NavLink>
      ))}
    </nav>
  );
}
