'use client';

import { useState, useEffect, useCallback } from 'react';
import { FlaskConical, Plus, Loader2 } from 'lucide-react';

interface AbTest {
  id: string;
  name: string;
  pageUrl: string;
  status: string;
  viewsA: number;
  viewsB: number;
  conversionsA: number;
  conversionsB: number;
  createdAt: number;
}

export function AbTestSection() {
  const [tests, setTests] = useState<AbTest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/marketing/ab-test');
      const json = await res.json();
      if (json.success) setTests(json.data?.tests ?? []);
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-fuchsia-400 animate-spin" /></div>;

  function convRate(conversions: number, views: number): string {
    if (views === 0) return '0%';
    return `${((conversions / views) * 100).toFixed(1)}%`;
  }

  return (
    <div className="space-y-4 mt-6">
      <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
        <FlaskConical className="w-4 h-4 text-amber-400" /> Tests A/B
      </h3>

      {tests.length === 0 ? (
        <p className="text-xs text-zinc-500 text-center py-6">Aucun test A/B en cours.</p>
      ) : (
        <div className="space-y-3">
          {tests.map(test => {
            const rateA = convRate(test.conversionsA, test.viewsA);
            const rateB = convRate(test.conversionsB, test.viewsB);
            const winner = test.conversionsA / Math.max(test.viewsA, 1) > test.conversionsB / Math.max(test.viewsB, 1) ? 'A' : 'B';
            return (
              <div key={test.id} className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-zinc-200">{test.name}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    test.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-500'
                  }`}>{test.status}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className={`p-3 rounded-lg border ${winner === 'A' && test.viewsA > 10 ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-zinc-700 bg-zinc-800/30'}`}>
                    <p className="text-[10px] font-bold text-zinc-400 mb-1">Variante A</p>
                    <p className="text-lg font-bold text-zinc-100">{rateA}</p>
                    <p className="text-[10px] text-zinc-500">{test.viewsA} vues · {test.conversionsA} conv.</p>
                  </div>
                  <div className={`p-3 rounded-lg border ${winner === 'B' && test.viewsB > 10 ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-zinc-700 bg-zinc-800/30'}`}>
                    <p className="text-[10px] font-bold text-zinc-400 mb-1">Variante B</p>
                    <p className="text-lg font-bold text-zinc-100">{rateB}</p>
                    <p className="text-[10px] text-zinc-500">{test.viewsB} vues · {test.conversionsB} conv.</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
