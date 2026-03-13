'use client';

import { useState, useEffect, useCallback } from 'react';
import { Target, Play, RefreshCw, Mail, Users, TrendingUp, MapPin, Loader2 } from 'lucide-react';

interface Lead {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  source: string;
  notes: string | null;
  createdAt: number;
}

const GOOGLE_MAPS_WORKFLOW_ID = 'nrRSJkM4xCBrzRau';

export default function ProspectionPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [triggerStatus, setTriggerStatus] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    try {
      const res = await fetch('/api/leads');
      const data = await res.json();
      if (data.success) {
        const coldLeads = data.data.leads.filter((l: Lead) =>
          l.notes?.includes('cold-email') || l.source === 'GMB'
        );
        setLeads(coldLeads);
      }
    } catch (err) {
      console.error('Prospection fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
    const interval = setInterval(fetchLeads, 30000);
    return () => clearInterval(interval);
  }, [fetchLeads]);

  async function launchCampaign() {
    setTriggering(true);
    setTriggerStatus(null);
    try {
      const res = await fetch('/api/n8n/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowId: GOOGLE_MAPS_WORKFLOW_ID }),
      });
      const data = await res.json();
      if (data.success) {
        setTriggerStatus('Campagne lancée ! Les leads arriveront dans quelques minutes.');
        setTimeout(fetchLeads, 5000);
      } else {
        setTriggerStatus(`Erreur: ${data.error}`);
      }
    } catch (err: any) {
      setTriggerStatus(`Erreur: ${err.message}`);
    } finally {
      setTriggering(false);
    }
  }

  const totalLeads = leads.length;
  const newLeads = leads.filter(l => l.status === 'Nouveau').length;
  const qualifiedLeads = leads.filter(l => l.status === 'Qualifié').length;
  const signed = leads.filter(l => l.status === 'Signé').length;
  const tauxReponse = totalLeads > 0 ? +((qualifiedLeads / totalLeads) * 100).toFixed(1) : 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-zinc-950/80 border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-3">
          <Target className="w-5 h-5 text-orange-400" />
          <h1 className="text-sm font-semibold text-zinc-100">Prospection</h1>
          <span className="text-xs text-zinc-600">Cold Outreach</span>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={fetchLeads}
              className="p-2 text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={launchCampaign}
              disabled={triggering}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {triggering ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              Lancer une campagne
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {triggerStatus && (
          <div className={`rounded-lg px-4 py-3 text-sm ${
            triggerStatus.startsWith('Erreur')
              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          }`}>
            {triggerStatus}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Leads générés', value: totalLeads, icon: Users, color: 'text-orange-400' },
            { label: 'Nouveaux', value: newLeads, icon: Mail, color: 'text-blue-400' },
            { label: 'Qualifiés', value: qualifiedLeads, icon: Target, color: 'text-violet-400' },
            { label: 'Taux réponse', value: `${tauxReponse}%`, icon: TrendingUp, color: 'text-emerald-400' },
          ].map((stat, i) => (
            <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-zinc-500">{stat.label}</span>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Leads table */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50">
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-orange-400" />
            <span className="text-sm font-semibold text-zinc-100">Leads cold email</span>
            <span className="text-xs text-zinc-500 ml-1">(Google Maps scraper)</span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-zinc-500 text-sm">Chargement...</div>
          ) : leads.length === 0 ? (
            <div className="p-8 text-center">
              <Target className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
              <p className="text-sm text-zinc-500 mb-1">Aucun lead cold email pour l'instant</p>
              <p className="text-xs text-zinc-600">Lancez une campagne Google Maps pour générer des leads automatiquement.</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/50">
              {leads.map(lead => (
                <div key={lead.id} className="flex items-center gap-4 px-4 py-3 hover:bg-zinc-800/20 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-200 truncate">
                      {lead.name}{lead.company ? ` — ${lead.company}` : ''}
                    </p>
                    <p className="text-xs text-zinc-500 truncate">
                      {lead.email ?? lead.phone ?? 'Pas de contact'}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    lead.status === 'Signé' ? 'bg-emerald-500/10 text-emerald-400' :
                    lead.status === 'Qualifié' ? 'bg-violet-500/10 text-violet-400' :
                    'bg-zinc-800 text-zinc-500'
                  }`}>
                    {lead.status}
                  </span>
                  <span className="text-xs text-zinc-600">
                    {new Date(lead.createdAt).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Instructions n8n */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h3 className="text-sm font-semibold text-zinc-200 mb-3">Configuration n8n requise</h3>
          <p className="text-xs text-zinc-400 mb-3">
            Pour brancher le workflow Google Maps Scraper sur le cockpit, configurez le webhook de sortie dans n8n :
          </p>
          <div className="bg-zinc-800 rounded-lg p-3 font-mono text-xs text-zinc-300">
            <p className="text-zinc-500 mb-1"># Dans le workflow n8n "Google Maps Scraper"</p>
            <p># Remplacer "Notion create page" par HTTP Request :</p>
            <p className="text-emerald-400 mt-1">POST {'{'}BASE_URL{'}'}/api/webhooks/cold-lead</p>
            <p className="text-zinc-500 mt-2"># Payload :</p>
            <p>{"{"} name, email, phone, company, website, address, category {"}"}</p>
          </div>
          <div className="mt-3 bg-zinc-800 rounded-lg p-3 font-mono text-xs text-zinc-300">
            <p className="text-zinc-500 mb-1"># Content workflows</p>
            <p className="text-emerald-400">POST /api/webhooks/content-idea   # Workflow 11</p>
            <p className="text-emerald-400">POST /api/webhooks/content-draft  # Workflow 12</p>
            <p className="text-emerald-400">POST /api/webhooks/content-published # Workflow 13</p>
          </div>
        </div>
      </div>
    </div>
  );
}
