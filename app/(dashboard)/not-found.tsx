import Link from 'next/link';
import { Compass } from 'lucide-react';

export default function DashboardNotFound() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center">
          <Compass className="w-8 h-8 text-fuchsia-400" />
        </div>
        <h2 className="text-lg font-semibold text-zinc-100">Page introuvable</h2>
        <p className="text-sm text-zinc-400">Cette page n&apos;existe pas ou a ete deplacee.</p>
        <Link
          href="/dashboard"
          className="inline-block px-4 py-2 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-400 text-sm hover:bg-fuchsia-500/20 transition-colors"
        >
          Retour au dashboard
        </Link>
      </div>
    </div>
  );
}
