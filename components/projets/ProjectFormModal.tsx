'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import type { ProjectType } from '@/lib/db/schema_projects';

const TYPES: ProjectType[] = ['Web', 'Branding', 'IA', 'Marketing'];
const AGENTS = [
  { id: 'musawwir', label: '🎨 Musawwir (Branding)' },
  { id: 'matin', label: '⚙️ Matin (Dev)' },
  { id: 'fatah', label: '📈 Fatah (Marketing)' },
  { id: 'hasib', label: '📊 Hasib (Data)' },
  { id: 'sani', label: '🤖 Sani (Automations)' },
  { id: 'khatib', label: '✍️ Khatib (Copywriting)' },
];

interface ProjectFormModalProps {
  onClose: () => void;
  onCreated: () => void;
}

export function ProjectFormModal({ onClose, onCreated }: ProjectFormModalProps) {
  const trapRef = useFocusTrap(true, onClose);
  const [form, setForm] = useState({
    clientName: '',
    projectType: 'Web' as ProjectType,
    budget: '',
    hoursEstimated: '',
    deadline: '',
    startDate: new Date().toISOString().split('T')[0],
    notes: '',
    teamAgents: [] as string[],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  const toggleAgent = (id: string) => {
    setForm(prev => ({
      ...prev,
      teamAgents: prev.teamAgents.includes(id)
        ? prev.teamAgents.filter(a => a !== id)
        : [...prev.teamAgents, id],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clientName.trim()) { setError('Nom du client requis.'); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: form.clientName.trim(),
          projectType: form.projectType,
          budget: form.budget ? parseFloat(form.budget) : null,
          hoursEstimated: form.hoursEstimated ? parseFloat(form.hoursEstimated) : 0,
          deadline: form.deadline ? new Date(form.deadline).getTime() : null,
          startDate: form.startDate ? new Date(form.startDate).getTime() : null,
          notes: form.notes || null,
          teamAgents: form.teamAgents,
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
          aria-label="Nouveau projet"
          tabIndex={-1}
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 sticky top-0 bg-zinc-950/95 backdrop-blur-sm">
            <h2 className="text-base font-semibold text-zinc-100">Nouveau projet</h2>
            <button onClick={onClose} aria-label="Fermer" className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Client & Type */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Projet</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs text-zinc-400 mb-1 block">Client *</label>
                  <input className={inputCls} placeholder="Nom du client" value={form.clientName} onChange={e => set('clientName', e.target.value)} required />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Type de prestation</label>
                  <select className={inputCls} value={form.projectType} onChange={e => set('projectType', e.target.value)}>
                    {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Budget (€)</label>
                  <input type="number" className={inputCls} placeholder="ex: 8000" value={form.budget} onChange={e => set('budget', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Heures estimées</label>
                  <input type="number" step="0.5" className={inputCls} placeholder="ex: 40" value={form.hoursEstimated} onChange={e => set('hoursEstimated', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Date début</label>
                  <input type="date" className={inputCls} value={form.startDate} onChange={e => set('startDate', e.target.value)} />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-zinc-400 mb-1 block">Deadline livraison</label>
                  <input type="date" className={inputCls} value={form.deadline} onChange={e => set('deadline', e.target.value)} />
                </div>
              </div>
            </div>

            {/* Team agents */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Équipe agents</p>
              <div className="flex flex-wrap gap-2">
                {AGENTS.map(a => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => toggleAgent(a.id)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                      form.teamAgents.includes(a.id)
                        ? 'bg-fuchsia-500/20 border-fuchsia-500/40 text-fuchsia-300'
                        : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300'
                    }`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Notes</label>
              <textarea
                className={`${inputCls} resize-none`}
                rows={2}
                placeholder="Contexte, contraintes, informations importantes..."
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
              />
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
                Créer le projet
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
