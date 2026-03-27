'use client';

import { useState, useEffect, useCallback } from 'react';
import { Link2, Plus, Loader2, Copy, Check, ExternalLink } from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  source: string;
  medium: string;
  content: string;
  baseUrl: string;
  status: string;
  clicks: number;
  leadsGenerated: number;
  revenueAttributed: number;
  createdAt: number;
}

export function UtmCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', source: 'google', medium: 'cpc', content: '', baseUrl: 'https://altctrl.fr' });

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/marketing/utm');
      const json = await res.json();
      if (json.success) setCampaigns(json.data?.campaigns ?? []);
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function create() {
    setSaving(true);
    try {
      const res = await fetch('/api/marketing/utm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) { setShowForm(false); setForm({ name: '', source: 'google', medium: 'cpc', content: '', baseUrl: 'https://altctrl.fr' }); load(); }
    } catch { /* silent */ } finally { setSaving(false); }
  }

  function copyUrl(campaign: Campaign) {
    const url = `${campaign.baseUrl}?utm_source=${campaign.source}&utm_medium=${campaign.medium}&utm_campaign=${encodeURIComponent(campaign.name)}${campaign.content ? `&utm_content=${encodeURIComponent(campaign.content)}` : ''}`;
    navigator.clipboard.writeText(url);
    setCopied(campaign.id);
    setTimeout(() => setCopied(null), 2000);
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-fuchsia-400 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2"><Link2 className="w-4 h-4 text-cyan-400" /> Campagnes UTM</h3>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/25 text-cyan-300 rounded-lg text-xs font-medium transition-colors">
          <Plus className="w-3.5 h-3.5" /> Nouvelle
        </button>
      </div>

      {showForm && (
        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nom campagne *" className="px-3 py-2 text-xs bg-black/30 border border-zinc-700 rounded-lg text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/40" />
            <input value={form.baseUrl} onChange={e => setForm(f => ({ ...f, baseUrl: e.target.value }))} placeholder="URL de base" className="px-3 py-2 text-xs bg-black/30 border border-zinc-700 rounded-lg text-zinc-200 placeholder:text-zinc-600 focus:outline-none" />
            <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} className="px-3 py-2 text-xs bg-black/30 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none">
              <option value="google">Google</option><option value="linkedin">LinkedIn</option><option value="facebook">Facebook</option><option value="instagram">Instagram</option><option value="email">Email</option><option value="newsletter">Newsletter</option>
            </select>
            <select value={form.medium} onChange={e => setForm(f => ({ ...f, medium: e.target.value }))} className="px-3 py-2 text-xs bg-black/30 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none">
              <option value="cpc">CPC</option><option value="organic">Organic</option><option value="social">Social</option><option value="email">Email</option><option value="referral">Referral</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="px-3 py-2 text-xs text-zinc-400 hover:text-zinc-300">Annuler</button>
            <button onClick={create} disabled={saving || !form.name} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-medium disabled:opacity-50">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Créer'}
            </button>
          </div>
        </div>
      )}

      {campaigns.length === 0 ? (
        <p className="text-xs text-zinc-500 text-center py-8">Aucune campagne UTM. Créez-en une pour tracker vos canaux.</p>
      ) : (
        <div className="space-y-2">
          {campaigns.map(c => (
            <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/60 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-200 truncate">{c.name}</p>
                <p className="text-[10px] text-zinc-500">{c.source} / {c.medium}</p>
              </div>
              <div className="flex items-center gap-4 text-[10px] text-zinc-400">
                <span>{c.clicks} clics</span>
                <span className="text-emerald-400">{c.leadsGenerated} leads</span>
                {c.revenueAttributed > 0 && <span className="text-cyan-400">{c.revenueAttributed}€</span>}
              </div>
              <button onClick={() => copyUrl(c)} className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors">
                {copied === c.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-500" />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
