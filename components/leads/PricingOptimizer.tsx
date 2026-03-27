'use client';

import { useState } from 'react';
import { Calculator, Loader2, TrendingUp } from 'lucide-react';

interface PricingResult {
  recommendedPrice: number;
  minPrice: number;
  maxPrice: number;
  confidence: number;
  reasoning: string;
  factors: { name: string; impact: string }[];
}

interface Props {
  leadBudget?: string | null;
  leadTimeline?: string | null;
  leadProjectType?: string | null;
}

export function PricingOptimizer({ leadBudget, leadTimeline, leadProjectType }: Props) {
  const [result, setResult] = useState<PricingResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function optimize() {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/pricing-optimizer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectType: leadProjectType || 'Site web',
          budget: leadBudget || 'Non renseigné',
          timeline: leadTimeline || 'Non renseigné',
          complexity: 'medium',
        }),
      });
      const json = await res.json();
      if (json.success) setResult(json.data);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }

  if (!result) {
    return (
      <button
        onClick={optimize}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/25 text-cyan-300 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Calculator className="w-3.5 h-3.5" />}
        Prix optimal IA
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4 text-cyan-400" />
        <span className="text-[10px] uppercase tracking-widest font-bold text-cyan-400">Prix recommandé</span>
      </div>

      <p className="text-3xl font-headline font-extrabold text-cyan-300 mb-1">
        {result.recommendedPrice.toLocaleString('fr-FR')} €
      </p>
      <p className="text-[10px] text-zinc-400 mb-3">
        Fourchette : {result.minPrice.toLocaleString('fr-FR')}€ — {result.maxPrice.toLocaleString('fr-FR')}€
        {result.confidence > 0 && ` (confiance ${result.confidence}%)`}
      </p>

      {result.reasoning && (
        <p className="text-xs text-zinc-400 leading-relaxed mb-3">{result.reasoning}</p>
      )}

      {result.factors?.length > 0 && (
        <div className="space-y-1">
          {result.factors.slice(0, 4).map((f, i) => (
            <div key={i} className="flex items-center justify-between text-[10px]">
              <span className="text-zinc-400">{f.name}</span>
              <span className={f.impact === 'up' ? 'text-emerald-400' : f.impact === 'down' ? 'text-rose-400' : 'text-zinc-500'}>
                {f.impact === 'up' ? '↑' : f.impact === 'down' ? '↓' : '—'}
              </span>
            </div>
          ))}
        </div>
      )}

      <button onClick={() => setResult(null)} className="mt-3 text-[10px] text-zinc-500 hover:text-zinc-300">
        Recalculer
      </button>
    </div>
  );
}
