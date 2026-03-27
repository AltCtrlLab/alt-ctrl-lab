'use client';

import { useState } from 'react';
import { Sparkles, Copy, Check, ExternalLink } from 'lucide-react';

interface ShowcaseResult {
  html: string;
  url: string;
}

export function ShowcaseGenerator() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ShowcaseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/portfolio/showcase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? 'Erreur lors de la génération');
      }

      const json = await res.json();
      setResult(json.data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!result?.url) return;
    try {
      await navigator.clipboard.writeText(result.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable
    }
  }

  return (
    <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5 space-y-4">
      {/* Header + Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-zinc-100">Portfolio Showcase</h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Générez une page vitrine à partir de vos projets
          </p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-fuchsia-500/10 hover:bg-fuchsia-500/20 border border-fuchsia-500/25 text-fuchsia-300 rounded-xl text-xs font-medium disabled:opacity-50 transition-colors"
        >
          {loading ? (
            <div className="w-3.5 h-3.5 rounded-full border-2 border-fuchsia-400 border-t-transparent animate-spin" />
          ) : (
            <Sparkles className="w-3.5 h-3.5" />
          )}
          Générer Showcase
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-10">
          <div className="w-8 h-8 rounded-full border-2 border-fuchsia-500 border-t-transparent animate-spin" />
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      {/* Result */}
      {result && !loading && (
        <div className="space-y-4">
          {/* URL bar */}
          <div className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2">
            <span className="flex-1 text-xs text-zinc-300 truncate">{result.url}</span>
            <button
              onClick={handleCopy}
              className="p-1.5 hover:bg-white/[0.05] rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors"
              aria-label="Copier l'URL"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
            <a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 hover:bg-white/[0.05] rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors"
              aria-label="Ouvrir dans un nouvel onglet"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Preview iframe */}
          <div className="relative w-full rounded-xl overflow-hidden border border-white/[0.06] bg-white">
            <iframe
              srcDoc={result.html}
              title="Aperçu Showcase"
              className="w-full h-[400px] border-0"
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        </div>
      )}
    </div>
  );
}
