'use client';
import { FileBarChart, Download } from 'lucide-react';
import type { ClientReport } from '@/lib/db/schema_portal';

interface Props {
  reports: ClientReport[];
  token: string;
}

export function PortalReports({ reports, token }: Props) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6">
      <h2 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2">
        <FileBarChart className="w-5 h-5 text-fuchsia-400" />
        Rapports
      </h2>
      <div className="space-y-2">
        {reports.map(r => (
          <div key={r.id} className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-xl border border-white/[0.04]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-fuchsia-500/10 flex items-center justify-center">
                <FileBarChart className="w-4 h-4 text-fuchsia-400" />
              </div>
              <div>
                <div className="text-zinc-200 text-sm">Rapport {r.period}</div>
                <div className="text-zinc-400 text-xs">{new Date(r.generatedAt).toLocaleDateString('fr-FR')}</div>
              </div>
            </div>
            <a
              href={`/api/reports/download?id=${r.id}&token=${token}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 text-xs hover:bg-zinc-700 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Consulter
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
