import { Link } from 'react-router-dom';
import MechanicalScanner from '../components/animations/MechanicalScanner';

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <MechanicalScanner size={140} active={false} />
      <p className="font-display text-5xl font-bold text-bad">404</p>
      <p className="text-slate-400">This page doesn’t exist. Ironic, for a dead link hunter.</p>
      <Link to="/" className="text-brand-soft underline underline-offset-4">Back to Home</Link>
    </div>
  );
}
