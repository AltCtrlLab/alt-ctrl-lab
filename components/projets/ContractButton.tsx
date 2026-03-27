'use client';

import { useState } from 'react';
import { FileSignature, Loader2, Copy, ChevronDown } from 'lucide-react';

const CONTRACT_TYPES = [
  { value: 'prestation', label: 'Prestation' },
  { value: 'nda', label: 'NDA' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'cgv', label: 'CGV' },
] as const;

interface Props {
  projectId: string;
  clientName: string;
  budget?: number | null;
}

export function ContractButton({ projectId, clientName, budget }: Props) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<string>('prestation');
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const res = await fetch('/api/documents/contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          variables: {
            clientName,
            projectId,
            amount: budget ? `${budget}€` : 'À définir',
          },
        }),
      });
      const json = await res.json();
      if (json.success && json.data?.content) setResult(json.data.content);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-2 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/25 text-sky-300 rounded-xl text-xs font-medium transition-colors"
      >
        <FileSignature className="w-3.5 h-3.5" />
        Contrat
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <select
          value={type}
          onChange={e => setType(e.target.value)}
          className="flex-1 px-2 py-1.5 text-xs bg-black/30 border border-zinc-700/60 rounded-lg text-zinc-200 focus:outline-none"
        >
          {CONTRACT_TYPES.map(ct => (
            <option key={ct.value} value={ct.value}>{ct.label}</option>
          ))}
        </select>
        <button
          onClick={generate}
          disabled={loading}
          className="px-3 py-1.5 bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/30 text-sky-300 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Générer'}
        </button>
      </div>

      {result && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-zinc-400">Contrat généré</span>
            <button onClick={() => navigator.clipboard.writeText(result)} className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300">
              <Copy className="w-3 h-3" /> Copier
            </button>
          </div>
          <pre className="text-xs text-zinc-300 whitespace-pre-wrap font-sans leading-relaxed max-h-40 overflow-y-auto rounded-lg bg-black/30 border border-zinc-700/60 p-3">{result}</pre>
        </div>
      )}
    </div>
  );
}
