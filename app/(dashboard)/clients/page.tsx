'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Users, Search, ArrowRight, Building2, CheckCircle2, Clock, Circle } from 'lucide-react';
import type { Lead } from '@/lib/db/schema_leads';

function getWorkflowProgress(lead: Lead): { done: number; total: number } {
  const total = 10;
  let done = 1; // lead always created
  if (lead.discoveryCallAt || lead.status === 'Discovery fait') done++;
  if (lead.propositionSentAt || ['Proposition envoyée', 'Relance 1', 'Relance 2', 'Signé'].includes(lead.status)) done++;
  if (lead.signedAt || lead.status === 'Signé') done++;
  return { done, total };
}

export default function ClientsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/leads')
      .then(r => r.json())
      .then(d => { if (d.success) setLeads(d.data.leads); })
      .finally(() => setLoading(false));
  }, []);

  const filtered = leads.filter(l => {
    if (!search) return true;
    const q = search.toLowerCase();
    return l.name.toLowerCase().includes(q) || (l.company ?? '').toLowerCase().includes(q);
  });

  // Sort: signed first, then by createdAt desc
  const sorted = [...filtered].sort((a, b) => {
    if (a.status === 'Signé' && b.status !== 'Signé') return -1;
    if (b.status === 'Signé' && a.status !== 'Signé') return 1;
    return (b.createdAt as number) - (a.createdAt as number);
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-zinc-950/90 border-b border-white/[0.06]">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center gap-3">
          <div className="w-7 h-7 bg-fuchsia-500/10 border border-fuchsia-500/20 rounded-lg flex items-center justify-center">
            <Users className="w-3.5 h-3.5 text-fuchsia-400" />
          </div>
          <h1 className="text-sm font-semibold text-zinc-100">Clients</h1>
          <div className="ml-auto relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher..."
              className="bg-zinc-900 border border-zinc-800 rounded-lg pl-8 pr-4 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-fuchsia-500/50 w-52"
            />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-5 h-5 border-2 border-fuchsia-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-20 text-zinc-600">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Aucun client trouvé</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sorted.map((lead, i) => {
              const { done, total } = getWorkflowProgress(lead);
              const progress = Math.round((done / total) * 100);
              const clientName = lead.company || lead.name;
              const isSigned = lead.status === 'Signé';

              return (
                <motion.div
                  key={lead.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => router.push(`/clients/${lead.id}`)}
                  className="group bg-zinc-900/60 border border-white/[0.07] hover:border-fuchsia-500/30 rounded-2xl p-5 cursor-pointer transition-all"
                >
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-fuchsia-500/15 to-violet-500/15 border border-fuchsia-500/20 rounded-xl flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-fuchsia-300">
                        {clientName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-zinc-100 truncate text-sm">{clientName}</p>
                      {lead.company && (
                        <p className="text-[11px] text-zinc-500 flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3" />
                          {lead.name}
                        </p>
                      )}
                    </div>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border shrink-0 ${
                      isSigned ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
                      lead.status === 'Perdu' ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' :
                      'text-zinc-400 bg-zinc-800 border-zinc-700'
                    }`}>
                      {lead.status}
                    </span>
                  </div>

                  {/* Progress */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] text-zinc-600">Parcours client</span>
                      <span className="text-[10px] text-zinc-500">{done}/{total}</span>
                    </div>
                    <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-fuchsia-500 to-violet-500 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                      {isSigned
                        ? <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />Client actif</>
                        : progress > 0
                          ? <><Clock className="w-3.5 h-3.5 text-fuchsia-400" />En cours</>
                          : <><Circle className="w-3.5 h-3.5 text-zinc-600" />Nouveau</>
                      }
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-fuchsia-400 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
