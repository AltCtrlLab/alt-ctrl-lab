'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Loader2, CheckCircle2 } from 'lucide-react';

interface BatchGeneratorModalProps {
  onClose: () => void;
  onSuccess: (count: number) => void;
}

const PLATFORMS = ['LinkedIn', 'Instagram', 'Twitter', 'Blog'];

export function BatchGeneratorModal({ onClose, onSuccess }: BatchGeneratorModalProps) {
  const [theme, setTheme] = useState('');
  const [count, setCount] = useState(5);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['LinkedIn']);
  const [period, setPeriod] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ count: number; fromTemplate?: boolean } | null>(null);
  const [error, setError] = useState('');

  function togglePlatform(p: string) {
    setSelectedPlatforms(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    );
  }

  async function handleGenerate() {
    if (!theme.trim()) { setError('Le thème est requis'); return; }
    if (selectedPlatforms.length === 0) { setError('Choisissez au moins une plateforme'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/ai/generate-content-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme, count, platforms: selectedPlatforms, period }),
      });
      const data = await res.json();
      if (data.success) {
        setResult({ count: data.data.count, fromTemplate: data.data.fromTemplate });
        onSuccess(data.data.count);
      } else {
        setError(data.error || 'Erreur de génération');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={e => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-fuchsia-400" />
              <h2 className="text-base font-semibold text-zinc-100">Batch Content Generator</h2>
            </div>
            <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {result ? (
            <div className="px-6 py-10 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-zinc-100 mb-1">
                {result.count} post{result.count > 1 ? 's' : ''} générés !
              </h3>
              {result.fromTemplate && (
                <p className="text-xs text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-lg mb-3">
                  Généré depuis template — l'API IA était indisponible
                </p>
              )}
              <p className="text-sm text-zinc-400 mb-6">
                Les brouillons sont disponibles dans votre Content Calendar.
              </p>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-fuchsia-600 hover:bg-fuchsia-500 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Voir les brouillons
              </button>
            </div>
          ) : (
            <div className="px-6 py-5 space-y-5">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Thème / Secteur *</label>
                <input
                  value={theme}
                  onChange={e => setTheme(e.target.value)}
                  placeholder="ex: automatisation pour PME, web design tendances 2025..."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-fuchsia-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Nombre de posts</label>
                <div className="flex gap-2">
                  {[3, 5, 10, 15, 30].map(n => (
                    <button
                      key={n}
                      onClick={() => setCount(n)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        count === n
                          ? 'bg-fuchsia-600 text-white'
                          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Plateformes *</label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map(p => (
                    <button
                      key={p}
                      onClick={() => togglePlatform(p)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        selectedPlatforms.includes(p)
                          ? 'bg-fuchsia-600 text-white'
                          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Période (optionnel)</label>
                <input
                  value={period}
                  onChange={e => setPeriod(e.target.value)}
                  placeholder="ex: Avril 2025, Q2 2025..."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-fuchsia-500"
                />
              </div>

              {error && (
                <p className="text-xs text-rose-400 bg-rose-500/10 rounded-lg px-3 py-2">{error}</p>
              )}

              <div className="flex justify-end gap-3 pt-1">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2 bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Génération en cours...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Générer {count} posts
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
