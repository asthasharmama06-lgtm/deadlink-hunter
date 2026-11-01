import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'ghost' | 'danger';
interface Props extends ButtonHTMLAttributes<HTMLButtonElement> { variant?: Variant }

const styles: Record<Variant, string> = {
  primary: 'bg-brand text-ink hover:bg-brand-soft shadow-[0_0_20px_rgba(124,140,255,.25)]',
  ghost: 'border border-edge text-slate-200 hover:border-brand/60 hover:bg-panel',
  danger: 'border border-bad/40 text-bad hover:bg-bad/10'
};

export default function Button({ variant = 'primary', className = '', ...rest }: Props) {
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition active:scale-[.97] disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}
    />
  );
}
