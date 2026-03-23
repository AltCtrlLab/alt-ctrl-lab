'use client';
import { Download, FileText } from 'lucide-react';
import type { Deliverable } from '@/lib/db/schema_portal';

interface Props {
  deliverables: Deliverable[];
  token: string;
}

function formatSize(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PortalDeliverables({ deliverables, token }: Props) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6">
      <h2 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2">
        <FileText className="w-5 h-5 text-fuchsia-400" />
        Livrables
      </h2>
      <div className="space-y-2">
        {deliverables.map(d => (
          <div key={d.id} className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-xl border border-white/[0.04]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <FileText className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <div className="text-zinc-200 text-sm">{d.filename}</div>
                <div className="text-zinc-400 text-xs">{formatSize(d.fileSize)} — {new Date(d.uploadedAt).toLocaleDateString('fr-FR')}</div>
              </div>
            </div>
            <a
              href={`/api/deliverables/download?id=${d.id}&token=${token}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 text-xs hover:bg-zinc-700 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Télécharger
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
