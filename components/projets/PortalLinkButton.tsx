'use client';

import { useState } from 'react';
import { Link2, Loader2, Copy, Check } from 'lucide-react';

interface Props {
  projectId: string;
}

export function PortalLinkButton({ projectId }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const res = await fetch('/api/portal/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, label: 'Accès client', expiresInDays: 30 }),
      });
      const json = await res.json();
      if (json.success && json.url) setUrl(json.url);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }

  function copyUrl() {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (url) {
    return (
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={url}
          className="flex-1 px-2 py-1.5 text-[10px] bg-black/30 border border-emerald-500/30 rounded-lg text-emerald-300 truncate"
        />
        <button onClick={copyUrl} className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 transition-colors">
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-emerald-400" />}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={generate}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-emerald-300 rounded-xl text-xs font-medium transition-colors disabled:opacity-50"
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
      Portail client
    </button>
  );
}
