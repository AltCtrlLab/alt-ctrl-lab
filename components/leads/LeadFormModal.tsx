'use client';

import { useState, useCallback } from 'react';
import { Loader2, X, UserPlus, ChevronDown, Mail, Phone } from 'lucide-react';
import type { LeadSource, LeadBudget } from '@/lib/db/schema_leads';
import type { ScoreCriteria } from '@/lib/scoring';
import { ScoreCalculator } from './ScoreCalculator';

interface LeadFormData {
  name: string;
  company: string;
  email: string;
  phone: string;
  source: LeadSource;
  budget: LeadBudget | '';
  timeline: string;
  notes: string;
  scoreCriteria: ScoreCriteria;
  score: number;
}

interface LeadFormModalProps {
  onClose: () => void;
  onCreated: () => void;
}

const SOURCES: LeadSource[] = ['LinkedIn', 'Email', 'Instagram', 'GMB', 'Referral', 'Site'];
const BUDGETS: LeadBudget[] = ['<2k', '2-5k', '5-10k', '>10k'];

export function LeadFormModal({ onClose, onCreated }: LeadFormModalProps) {
  const [form, setForm] = useState<LeadFormData>({
    name: '', company: '', email: '', phone: '',
    source: 'Site', budget: '', timeline: '', notes: '',
    scoreCriteria: {}, score: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof LeadFormData, value: any) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleScoreChange = useCallback((criteria: ScoreCriteria, score: number) => {
    setForm(prev => ({ ...prev, scoreCriteria: criteria, score }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Le nom est requis.'); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          company: form.company || null,
          email: form.email || null,
          phone: form.phone || null,
          source: form.source,
          budget: form.budget || null,
          timeline: form.timeline || null,
          notes: form.notes || null,
          scoreCriteria: form.scoreCriteria,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      onCreated();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const inputCls = "w-full rounded-full bg-[#131315] border-none focus:ring-2 focus:ring-fuchsia-500/50 text-[#f9f5f8] placeholder:text-[#adaaad]/30 py-4 px-6 text-sm outline-none transition-all";
  const selectCls = "w-full rounded-full bg-[#131315] border-none focus:ring-2 focus:ring-fuchsia-500/50 text-[#f9f5f8] py-4 px-6 pr-12 text-sm outline-none appearance-none transition-all";
  const labelCls = "text-[10px] uppercase tracking-widest text-[#adaaad] px-4 block mb-2";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-[#0e0e10]/60 backdrop-blur-md"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[#19191c]/70 backdrop-blur-[20px] border border-[#48474a]/20 border-t-white/10 w-full max-w-2xl rounded-xl shadow-[0px_24px_48px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center px-8 py-6 border-b border-[#48474a]/10 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-fuchsia-500/10 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-fuchsia-400" />
            </div>
            <h2 className="font-headline font-bold text-xl text-[#f9f5f8]">Nouveau lead</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-[#262528] transition-colors"
          >
            <X className="w-5 h-5 text-[#adaaad]" />
          </button>
        </div>

        {/* Scrollable body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
            {/* Identity section */}
            <div className="space-y-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#adaaad] px-4">Identit&eacute;</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Nom du lead *</label>
                  <input
                    className={inputCls}
                    placeholder="Jean Dupont"
                    value={form.name}
                    onChange={e => set('name', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className={labelCls}>Entreprise</label>
                  <input
                    className={inputCls}
                    placeholder="ACME Corp"
                    value={form.company}
                    onChange={e => set('company', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls}>Adresse email</label>
                  <div className="relative">
                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#adaaad]/40" />
                    <input
                      type="email"
                      className={`${inputCls} pl-12`}
                      placeholder="jean@acme.fr"
                      value={form.email}
                      onChange={e => set('email', e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>T&eacute;l&eacute;phone</label>
                  <div className="relative">
                    <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#adaaad]/40" />
                    <input
                      className={`${inputCls} pl-12`}
                      placeholder="+33 6 00 00 00 00"
                      value={form.phone}
                      onChange={e => set('phone', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Commercial section */}
            <div className="space-y-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#adaaad] px-4">Commercial</p>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>Source</label>
                  <div className="relative">
                    <select
                      className={selectCls}
                      value={form.source}
                      onChange={e => set('source', e.target.value as LeadSource)}
                    >
                      {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-[#adaaad]/40 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Budget estim&eacute;</label>
                  <div className="relative">
                    <select
                      className={selectCls}
                      value={form.budget}
                      onChange={e => set('budget', e.target.value)}
                    >
                      <option value="">&mdash;</option>
                      {BUDGETS.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                    <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-[#adaaad]/40 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Timeline</label>
                  <input
                    className={inputCls}
                    placeholder="ex: 6 semaines"
                    value={form.timeline}
                    onChange={e => set('timeline', e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>Notes strat&eacute;giques</label>
                <textarea
                  className="w-full rounded-lg bg-[#131315] border-none focus:ring-2 focus:ring-fuchsia-500/50 text-[#f9f5f8] placeholder:text-[#adaaad]/30 py-4 px-6 text-sm outline-none resize-none transition-all"
                  rows={2}
                  placeholder="Contexte, besoins, red flags..."
                  value={form.notes}
                  onChange={e => set('notes', e.target.value)}
                />
              </div>
            </div>

            {/* Score calculator */}
            <div className="p-4 bg-[#131315] rounded-xl border border-[#48474a]/20 space-y-3">
              <ScoreCalculator onChange={handleScoreChange} />
            </div>

            {error && (
              <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-4 py-3">{error}</p>
            )}
          </div>

          {/* Footer */}
          <div className="p-8 bg-[#1f1f22]/40 flex justify-between items-center gap-4 border-t border-[#48474a]/10 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-8 py-4 rounded-full text-[#adaaad] hover:text-[#f9f5f8] text-sm uppercase tracking-widest transition-all"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 bg-gradient-to-br from-fuchsia-500 to-fuchsia-600 px-12 py-4 rounded-full text-white font-headline font-extrabold text-sm uppercase tracking-widest shadow-[0px_8px_24px_rgba(223,142,255,0.3)] hover:scale-105 active:scale-95 disabled:opacity-50 transition-all"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Cr&eacute;er le lead
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
