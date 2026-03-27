'use client';

import { useState, useEffect, useCallback } from 'react';
import { Gift, Copy, Check, Loader2 } from 'lucide-react';

interface Referral {
  id: string;
  code: string;
  referrerName: string;
  commissionPercent: number;
  clicks: number;
  conversions: number;
  revenueGenerated: number;
  commissionEarned: number;
  active: number;
}

export function ReferralSection() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/marketing/referral');
      const json = await res.json();
      if (json.success) setReferrals(json.data?.referrals ?? []);
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function copyCode(code: string) {
    navigator.clipboard.writeText(`https://altctrl.fr?ref=${code}`);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  }

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-fuchsia-400 animate-spin" /></div>;

  return (
    <div className="space-y-4 mt-6">
      <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
        <Gift className="w-4 h-4 text-pink-400" /> Parrainage & Affiliés
      </h3>

      {referrals.length === 0 ? (
        <p className="text-xs text-zinc-500 text-center py-6">Aucun programme de parrainage actif.</p>
      ) : (
        <div className="space-y-2">
          {referrals.map(r => (
            <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl border border-zinc-800 bg-zinc-900/40">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-200">{r.referrerName}</p>
                <p className="text-[10px] text-zinc-500">Code: {r.code} · {r.commissionPercent}% commission</p>
              </div>
              <div className="flex items-center gap-4 text-[10px] text-zinc-400">
                <span>{r.clicks} clics</span>
                <span className="text-emerald-400">{r.conversions} conv.</span>
                {r.commissionEarned > 0 && <span className="text-amber-400">{r.commissionEarned}€</span>}
              </div>
              <button onClick={() => copyCode(r.code)} className="p-1.5 rounded-lg hover:bg-zinc-800">
                {copied === r.code ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-500" />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
