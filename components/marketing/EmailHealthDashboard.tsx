'use client';

import { useState, useEffect } from 'react';
import { Mail, Shield, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';

interface EmailHealth {
  domain: string;
  spfValid: boolean;
  dkimValid: boolean;
  dmarcValid: boolean;
  bounceRate: number;
  spamRate: number;
  deliverabilityScore: number;
  lastCheck: number;
}

export function EmailHealthDashboard() {
  const [health, setHealth] = useState<EmailHealth | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/marketing/email-health')
      .then(r => r.json())
      .then(json => {
        if (json.success) setHealth(json.data);
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-fuchsia-400 animate-spin" /></div>;
  if (!health) return <p className="text-xs text-zinc-500 text-center py-6">Aucune donnée de santé email.</p>;

  const checks = [
    { label: 'SPF', valid: health.spfValid },
    { label: 'DKIM', valid: health.dkimValid },
    { label: 'DMARC', valid: health.dmarcValid },
  ];

  const scoreColor = health.deliverabilityScore >= 80 ? 'text-emerald-400' : health.deliverabilityScore >= 60 ? 'text-amber-400' : 'text-rose-400';

  return (
    <div className="space-y-4 mt-6">
      <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
        <Mail className="w-4 h-4 text-sky-400" /> Santé Email
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Deliverability score */}
        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 text-center">
          <p className={`text-3xl font-bold ${scoreColor}`}>{health.deliverabilityScore}%</p>
          <p className="text-[10px] text-zinc-400 mt-1">Délivrabilité</p>
        </div>

        {/* DNS checks */}
        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40">
          <p className="text-[10px] text-zinc-400 mb-2">Authentification</p>
          <div className="space-y-1.5">
            {checks.map(c => (
              <div key={c.label} className="flex items-center gap-2 text-xs">
                {c.valid ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />}
                <span className={c.valid ? 'text-emerald-400' : 'text-rose-400'}>{c.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bounce rate */}
        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 text-center">
          <p className={`text-2xl font-bold ${health.bounceRate > 5 ? 'text-rose-400' : 'text-zinc-200'}`}>{health.bounceRate.toFixed(1)}%</p>
          <p className="text-[10px] text-zinc-400 mt-1">Taux de rebond</p>
        </div>

        {/* Spam rate */}
        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 text-center">
          <p className={`text-2xl font-bold ${health.spamRate > 0.5 ? 'text-rose-400' : 'text-zinc-200'}`}>{health.spamRate.toFixed(2)}%</p>
          <p className="text-[10px] text-zinc-400 mt-1">Taux de spam</p>
        </div>
      </div>
    </div>
  );
}
