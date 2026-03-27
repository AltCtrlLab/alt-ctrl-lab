'use client';

import { useState, useEffect } from 'react';
import { MessageSquareHeart, RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface VocReport {
  overallSentiment: 'positive' | 'neutral' | 'negative';
  sentimentScore: number;
  topThemes: string[];
  painPoints: string[];
  satisfactionDrivers: string[];
  npsAverage: number;
  totalFeedbacks: number;
}

const SENTIMENT_CONFIG = {
  positive: { icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Positif' },
  neutral: { icon: Minus, color: 'text-amber-400', bg: 'bg-amber-500/10', label: 'Neutre' },
  negative: { icon: TrendingDown, color: 'text-rose-400', bg: 'bg-rose-500/10', label: 'Négatif' },
};

export function VocSummaryWidget() {
  const [report, setReport] = useState<VocReport | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setLoading(true);
      const res = await fetch('/api/ai/voc-analysis');
      const json = await res.json();
      if (json.success) setReport(json.data);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="h-4 w-40 bg-zinc-800 rounded animate-pulse mb-4" />
        <div className="h-20 bg-zinc-800/50 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (!report) return null;

  const cfg = SENTIMENT_CONFIG[report.overallSentiment] ?? SENTIMENT_CONFIG.neutral;
  const SentimentIcon = cfg.icon;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MessageSquareHeart className="w-4 h-4 text-fuchsia-400" />
          <h3 className="text-sm font-semibold text-zinc-100">Voix du Client</h3>
        </div>
        <button onClick={load} className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors">
          <RefreshCw className="w-3.5 h-3.5 text-zinc-500" />
        </button>
      </div>

      {/* Sentiment header */}
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2 rounded-lg ${cfg.bg}`}>
          <SentimentIcon className={`w-5 h-5 ${cfg.color}`} />
        </div>
        <div>
          <p className={`text-sm font-bold ${cfg.color}`}>{cfg.label}</p>
          <p className="text-[10px] text-zinc-400">NPS moyen : {report.npsAverage}/10 — {report.totalFeedbacks} feedbacks</p>
        </div>
      </div>

      {/* Themes */}
      {report.topThemes.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1.5">Thèmes récurrents</p>
          <div className="flex flex-wrap gap-1.5">
            {report.topThemes.slice(0, 5).map(theme => (
              <span key={theme} className="px-2 py-0.5 text-[10px] rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                {theme}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Pain points */}
      {report.painPoints.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1.5">Points de friction</p>
          <ul className="space-y-1">
            {report.painPoints.slice(0, 3).map(point => (
              <li key={point} className="text-xs text-zinc-400 flex items-start gap-1.5">
                <span className="w-1 h-1 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
