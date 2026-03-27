'use client';

import { useState } from 'react';
import { Shield, Loader2, Heart, BarChart3, RefreshCw } from 'lucide-react';

interface ObjectionResponse {
  approach: string;
  response: string;
}

const APPROACH_META: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  empathetic: { icon: Heart, color: 'text-rose-400 bg-rose-500/10 border-rose-500/20', label: 'Empathique' },
  'data-driven': { icon: BarChart3, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20', label: 'Data-driven' },
  reframe: { icon: RefreshCw, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', label: 'Recadrage' },
};

interface Props {
  leadId: string;
  leadName: string;
}

export function ObjectionHandler({ leadId, leadName }: Props) {
  const [open, setOpen] = useState(false);
  const [objection, setObjection] = useState('');
  const [responses, setResponses] = useState<ObjectionResponse[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!objection.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/ai/objection-handler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objection: objection.trim(), leadId, context: `Lead: ${leadName}` }),
      });
      const json = await res.json();
      if (json.success && json.data?.responses) {
        setResponses(json.data.responses);
      }
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-300 rounded-xl text-xs font-bold transition-colors"
      >
        <Shield className="w-3.5 h-3.5" />
        Objection IA
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Shield className="w-3.5 h-3.5 text-amber-400" />
        <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">Objection Handler</span>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={objection}
          onChange={e => setObjection(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="Ex: C'est trop cher..."
          className="flex-1 px-3 py-2 text-xs bg-black/30 border border-zinc-700/60 rounded-lg text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/40"
        />
        <button
          onClick={handleSubmit}
          disabled={loading || !objection.trim()}
          className="px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Go'}
        </button>
      </div>

      {responses.length > 0 && (
        <div className="space-y-2">
          {responses.map((r, i) => {
            const meta = APPROACH_META[r.approach] || APPROACH_META.reframe;
            const Icon = meta.icon;
            return (
              <div key={i} className="rounded-lg border border-zinc-700/60 bg-black/30 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-1 rounded border ${meta.color}`}>
                    <Icon className="w-3 h-3" />
                  </div>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{meta.label}</span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">{r.response}</p>
                <button
                  onClick={() => navigator.clipboard.writeText(r.response)}
                  className="mt-2 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Copier
                </button>
              </div>
            );
          })}
        </div>
      )}

      <button onClick={() => { setOpen(false); setResponses([]); setObjection(''); }} className="text-[10px] text-zinc-500 hover:text-zinc-300">
        Fermer
      </button>
    </div>
  );
}
