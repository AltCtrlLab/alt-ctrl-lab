'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-lg font-semibold text-zinc-100">Une erreur est survenue</h2>
        <p className="text-sm text-zinc-400 max-w-md">{error.message}</p>
        <button
          onClick={reset}
          className="px-4 py-2 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-400 text-sm hover:bg-fuchsia-500/20 transition-colors"
        >
          Reessayer
        </button>
      </div>
    </div>
  );
}
