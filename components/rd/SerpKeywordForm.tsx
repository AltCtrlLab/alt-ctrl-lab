'use client';

import { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';

interface SerpKeywordFormProps {
  onAdded: () => void;
}

export function SerpKeywordForm({ onAdded }: SerpKeywordFormProps) {
  const [keyword, setKeyword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = keyword.trim();
    if (!trimmed) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/cron/serp-monitor', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? 'Erreur lors de l\'ajout');
      }

      setKeyword('');
      onAdded();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        type="text"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        placeholder="Ajouter un mot-clé..."
        className="flex-1 bg-white/[0.05] border border-white/[0.1] rounded-xl px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-fuchsia-500/50 transition-colors"
      />
      <button
        type="submit"
        disabled={submitting || !keyword.trim()}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-fuchsia-500/10 hover:bg-fuchsia-500/20 border border-fuchsia-500/25 text-fuchsia-300 rounded-xl text-xs font-medium disabled:opacity-50 transition-colors"
      >
        {submitting ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <Plus className="w-3 h-3" />
        )}
        Ajouter
      </button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </form>
  );
}
