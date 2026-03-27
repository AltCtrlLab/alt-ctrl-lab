'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, ArrowUp, ArrowDown, Minus, ExternalLink, RefreshCw } from 'lucide-react';
import { SerpKeywordForm } from '@/components/rd/SerpKeywordForm';

interface SerpKeyword {
  id: string;
  keyword: string;
  position: number | null;
  url: string | null;
  previousPosition: number | null;
  lastChecked: number;
}

function PositionChange({ current, previous }: { current: number | null; previous: number | null }) {
  if (current === null || previous === null) {
    return <span className="text-zinc-600"><Minus className="w-3.5 h-3.5" /></span>;
  }

  const diff = previous - current; // positive = improved

  if (diff > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-emerald-400 text-xs">
        <ArrowUp className="w-3.5 h-3.5" />
        +{diff}
      </span>
    );
  }

  if (diff < 0) {
    return (
      <span className="inline-flex items-center gap-1 text-red-400 text-xs">
        <ArrowDown className="w-3.5 h-3.5" />
        {diff}
      </span>
    );
  }

  return <span className="text-zinc-500 text-xs">=</span>;
}

export function SerpMonitor() {
  const [keywords, setKeywords] = useState<SerpKeyword[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchKeywords = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('/api/cron/serp-monitor');
      if (!res.ok) throw new Error('Erreur de chargement');
      const json = await res.json();
      setKeywords(json.data?.keywords ?? []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeywords();
  }, [fetchKeywords]);

  return (
    <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <Search className="w-4 h-4 text-fuchsia-400" />
          <h3 className="text-sm font-semibold text-zinc-100">Suivi SERP</h3>
          <span className="text-xs text-zinc-500">({keywords.length} mots-clés)</span>
        </div>
        <button
          onClick={fetchKeywords}
          className="p-1.5 hover:bg-white/[0.05] rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors"
          aria-label="Rafraîchir"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Add keyword form */}
      <div className="px-5 py-3 border-b border-white/[0.04]">
        <SerpKeywordForm onAdded={fetchKeywords} />
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 rounded-full border-2 border-fuchsia-500 border-t-transparent animate-spin" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="px-5 py-4">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* Table */}
      {!loading && !error && keywords.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-zinc-500 border-b border-white/[0.04]">
                <th className="text-left font-medium px-5 py-3">Mot-clé</th>
                <th className="text-center font-medium px-3 py-3">Position</th>
                <th className="text-center font-medium px-3 py-3">Évolution</th>
                <th className="text-left font-medium px-3 py-3">URL</th>
                <th className="text-right font-medium px-5 py-3">Dernière vérif.</th>
              </tr>
            </thead>
            <tbody>
              {keywords.map((kw) => (
                <tr
                  key={kw.id}
                  className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-5 py-3 text-zinc-200 font-medium">{kw.keyword}</td>
                  <td className="px-3 py-3 text-center">
                    {kw.position !== null ? (
                      <span
                        className={`inline-flex items-center justify-center w-8 h-6 rounded-lg text-xs font-bold ${
                          kw.position <= 3
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : kw.position <= 10
                            ? 'bg-amber-500/15 text-amber-400'
                            : 'bg-zinc-500/15 text-zinc-400'
                        }`}
                      >
                        {kw.position}
                      </span>
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <PositionChange current={kw.position} previous={kw.previousPosition} />
                  </td>
                  <td className="px-3 py-3">
                    {kw.url ? (
                      <a
                        href={kw.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-fuchsia-400 hover:text-fuchsia-300 transition-colors max-w-[200px] truncate"
                      >
                        {new URL(kw.url).pathname}
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right text-zinc-500">
                    {kw.lastChecked
                      ? new Date(kw.lastChecked).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && keywords.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center px-5">
          <Search className="w-6 h-6 text-zinc-600 mb-2" />
          <p className="text-xs text-zinc-500">
            Aucun mot-clé suivi. Ajoutez-en un ci-dessus pour commencer.
          </p>
        </div>
      )}
    </div>
  );
}
