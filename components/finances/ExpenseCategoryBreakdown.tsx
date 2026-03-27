'use client';

import { useState, useEffect } from 'react';
import { PieChart, Loader2 } from 'lucide-react';

interface CategoryData {
  category: string;
  total: number;
  count: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  api: 'bg-cyan-500',
  hosting: 'bg-violet-500',
  tools: 'bg-amber-500',
  freelance: 'bg-rose-500',
  ads: 'bg-emerald-500',
  other: 'bg-zinc-500',
};

export function ExpenseCategoryBreakdown() {
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [profitNet, setProfitNet] = useState<number | null>(null);
  const [margin, setMargin] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/finances/expenses')
      .then(r => r.json())
      .then(json => {
        if (json.success && json.data) {
          setCategories(json.data.byCategory ?? []);
          setProfitNet(json.data.profitNet ?? null);
          setMargin(json.data.profitMargin ?? null);
        }
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 text-fuchsia-400 animate-spin" /></div>;
  if (categories.length === 0) return null;

  const total = categories.reduce((s, c) => s + c.total, 0);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 mt-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <PieChart className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-zinc-100">Répartition Dépenses</h3>
        </div>
        {profitNet !== null && (
          <span className={`text-xs font-bold ${profitNet >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            Profit net : {profitNet.toLocaleString('fr-FR')}€
            {margin !== null && ` (${margin.toFixed(1)}%)`}
          </span>
        )}
      </div>

      {/* Bar breakdown */}
      <div className="h-3 rounded-full overflow-hidden flex mb-4">
        {categories.map(c => (
          <div
            key={c.category}
            className={`${CATEGORY_COLORS[c.category] || 'bg-zinc-600'} first:rounded-l-full last:rounded-r-full`}
            style={{ width: `${(c.total / total) * 100}%` }}
            title={`${c.category}: ${c.total}€`}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {categories.map(c => (
          <div key={c.category} className="flex items-center gap-2 text-xs">
            <span className={`w-2.5 h-2.5 rounded-full ${CATEGORY_COLORS[c.category] || 'bg-zinc-600'}`} />
            <span className="text-zinc-400 capitalize">{c.category}</span>
            <span className="text-zinc-300 font-medium ml-auto">{c.total.toLocaleString('fr-FR')}€</span>
          </div>
        ))}
      </div>
    </div>
  );
}
