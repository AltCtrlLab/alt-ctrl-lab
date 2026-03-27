'use client';

import { useState } from 'react';
import { FileDown, Loader2, Check } from 'lucide-react';

interface Props {
  projectId: string;
  projectType: string;
  clientName: string;
}

export function ExportPdfButton({ projectId, projectType, clientName }: Props) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function exportPdf() {
    setLoading(true);
    try {
      const res = await fetch('/api/documents/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'proposal',
          projectId,
          data: { clientName, projectType },
        }),
      });
      const json = await res.json();
      if (json.success && json.data?.html) {
        const blob = new Blob([json.data.html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${clientName.replace(/\s+/g, '-')}-${projectType}.html`;
        a.click();
        URL.revokeObjectURL(url);
        setDone(true);
        setTimeout(() => setDone(false), 3000);
      }
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={exportPdf}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-2 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/25 text-violet-300 rounded-xl text-xs font-medium transition-colors disabled:opacity-50"
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : done ? <Check className="w-3.5 h-3.5" /> : <FileDown className="w-3.5 h-3.5" />}
      Export PDF
    </button>
  );
}
