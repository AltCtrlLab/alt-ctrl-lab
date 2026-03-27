'use client';

import { useState } from 'react';
import { BookOpen, Loader2, Copy } from 'lucide-react';

interface Props {
  projectId: string;
  projectPhase: string;
}

export function CaseStudyButton({ projectId, projectPhase }: Props) {
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (projectPhase !== 'Livré') return null;

  async function generate() {
    setLoading(true);
    try {
      const res = await fetch('/api/content/case-study', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        const cs = json.data;
        setResult(`${cs.title}\n\n${cs.challenge}\n\n${cs.solution}\n\n${cs.results?.join('\n') || ''}`);
      }
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Case Study</span>
          <button onClick={() => navigator.clipboard.writeText(result)} className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300">
            <Copy className="w-3 h-3" /> Copier
          </button>
        </div>
        <pre className="text-xs text-zinc-300 whitespace-pre-wrap font-sans leading-relaxed max-h-40 overflow-y-auto rounded-lg bg-black/30 border border-zinc-700/60 p-3">{result}</pre>
      </div>
    );
  }

  return (
    <button
      onClick={generate}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-2 bg-fuchsia-500/10 hover:bg-fuchsia-500/20 border border-fuchsia-500/25 text-fuchsia-300 rounded-xl text-xs font-medium transition-colors disabled:opacity-50"
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BookOpen className="w-3.5 h-3.5" />}
      Case Study
    </button>
  );
}
