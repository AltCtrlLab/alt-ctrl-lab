'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
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
  const trapRef = useFocusTrap(true, onClose);
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

  const inputCls = "w-full px-3 py-2.5 text-sm bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:border-fuchsia-500/60 focus:ring-1 focus:ring-fuchsia-500/20 transition-all";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={e => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          ref={trapRef}
          role="dialog"
          aria-modal="true"
          aria-label="Nouveau lead"
          tabIndex={-1}
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 sticky top-0 bg-zinc-950/95 backdrop-blur-sm z-10">
            <h2 className="text-base font-semibold text-zinc-100">Nouveau lead</h2>
            <button onClick={onClose} aria-label="Fermer" className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Identity */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Identité</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Nom *</label>
                  <input className={inputCls} placeholder="Jean Dupont" value={form.name} onChange={e => set('name', e.target.value)} required />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Entreprise</label>
                  <input className={inputCls} placeholder="ACME Corp" value={form.company} onChange={e => set('company', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Email</label>
                  <input type="email" className={inputCls} placeholder="jean@acme.fr" value={form.email} onChange={e => set('email', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Téléphone</label>
                  <input className={inputCls} placeholder="+33 6 00 00 00 00" value={form.phone} onChange={e => set('phone', e.target.value)} />
                </div>
              </div>
            </div>

            {/* Commercial */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Commercial</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Source</label>
                  <select className={inputCls} value={form.source} onChange={e => set('source', e.target.value as LeadSource)}>
                    {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Budget estimé</label>
                  <select className={inputCls} value={form.budget} onChange={e => set('budget', e.target.value)}>
                    <option value="">—</option>
                    {BUDGETS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Timeline</label>
                  <input className={inputCls} placeholder="ex: 6 semaines" value={form.timeline} onChange={e => set('timeline', e.target.value)} />
                </div>
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Notes</label>
                <textarea
                  className={`${inputCls} resize-none`}
                  rows={2}
                  placeholder="Contexte, besoins, red flags..."
                  value={form.notes}
                  onChange={e => set('notes', e.target.value)}
                />
              </div>
            </div>

            {/* Score calculator */}
            <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800 space-y-3">
              <ScoreCalculator onChange={handleScoreChange} />
            </div>

            {error && (
              <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="flex gap-3 justify-end">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-all">
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2 bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-all"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Créer le lead
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
