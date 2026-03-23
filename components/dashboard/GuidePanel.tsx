'use client';

import React, { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Compass, Keyboard, HelpCircle } from 'lucide-react';
import { NAV_SECTIONS, TEAM_AI_ITEMS } from '@/lib/constants/navigation';
import { useFocusTrap } from '@/hooks/useFocusTrap';

interface GuidePanelProps {
  open: boolean;
  onClose: () => void;
  isDark: boolean;
}

/** Derive guide sections from the shared navigation constants */
const GUIDE_SECTIONS = [
  ...NAV_SECTIONS,
  { title: 'Équipe IA', items: TEAM_AI_ITEMS },
];

const SHORTCUTS = [
  { keys: 'Ctrl + K', desc: 'Recherche globale' },
  { keys: 'Ctrl + B', desc: 'Nouveau brief' },
  { keys: 'Theme', desc: 'Toggle clair/sombre via la sidebar' },
];

const FAQ = [
  { q: 'Comment créer un nouveau projet ?', a: 'Depuis la page Leads, passez un lead au statut "Signé" — un projet et une facture seront créés automatiquement.' },
  { q: 'Comment fonctionnent les agents IA ?', a: 'Chaque agent a une spécialité (dev, marketing, branding). Envoyez un brief depuis la page Brief et les agents traitent votre demande.' },
  { q: 'Comment connecter n8n ?', a: 'Les workflows n8n sont configurés dans la page Automations. Les webhooks synchronisent automatiquement les données.' },
  { q: 'Où voir l\'historique des tâches ?', a: 'La page Historique affiche toutes les exécutions passées des agents avec leur statut.' },
];

export function GuidePanel({ open, onClose, isDark }: GuidePanelProps) {
  const trapRef = useFocusTrap(open, onClose);
  const handleDismiss = useCallback(() => {
    localStorage.setItem('acl-guide-dismissed', '1');
    onClose();
  }, [onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          {/* Panel */}
          <motion.div
            ref={trapRef}
            role="dialog"
            aria-modal="true"
            aria-label="Guide AltCtrl.Lab"
            tabIndex={-1}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={`fixed right-0 top-0 bottom-0 w-full max-w-md z-50 overflow-y-auto border-l ${
              isDark
                ? 'bg-zinc-950/95 border-white/[0.08]'
                : 'bg-white/95 border-neutral-200'
            } backdrop-blur-xl`}
          >
            {/* Close */}
            <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-cyan-400" />
                <h2 className={`text-sm font-semibold ${isDark ? 'text-zinc-100' : 'text-neutral-800'}`}>
                  Guide AltCtrl.Lab
                </h2>
              </div>
              <button onClick={onClose} aria-label="Fermer" className="text-zinc-400 hover:text-zinc-300 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-8">
              {/* Bienvenue */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <h3 className={`text-sm font-semibold ${isDark ? 'text-zinc-200' : 'text-neutral-700'}`}>Bienvenue</h3>
                </div>
                <p className={`text-sm leading-relaxed ${isDark ? 'text-zinc-400' : 'text-neutral-500'}`}>
                  Ce cockpit centralise toutes les opérations d&apos;AltCtrl.Lab. Leads, projets, finances,
                  contenu et automatisations sont gérés depuis une interface unique. Les agents IA
                  traitent les tâches en arrière-plan pendant que tu supervises.
                </p>
              </section>

              {/* Navigation */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Compass className="w-4 h-4 text-fuchsia-400" />
                  <h3 className={`text-sm font-semibold ${isDark ? 'text-zinc-200' : 'text-neutral-700'}`}>Navigation</h3>
                </div>
                <div className="space-y-4">
                  {GUIDE_SECTIONS.map(section => (
                    <div key={section.title}>
                      <p className={`text-[10px] uppercase tracking-widest font-medium mb-1.5 ${isDark ? 'text-zinc-400' : 'text-neutral-400'}`}>
                        {section.title}
                      </p>
                      <div className="space-y-1.5">
                        {section.items.map(item => {
                          const Icon = item.icon;
                          return (
                            <div
                              key={item.label}
                              className={`flex items-start gap-3 px-3 py-2 rounded-lg ${isDark ? 'bg-zinc-900/40' : 'bg-neutral-50'}`}
                            >
                              <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${isDark ? 'text-zinc-400' : 'text-neutral-400'}`} />
                              <div>
                                <p className={`text-sm font-medium ${isDark ? 'text-zinc-300' : 'text-neutral-700'}`}>{item.label}</p>
                                {item.desc && (
                                  <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-neutral-400'}`}>{item.desc}</p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Raccourcis */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Keyboard className="w-4 h-4 text-amber-400" />
                  <h3 className={`text-sm font-semibold ${isDark ? 'text-zinc-200' : 'text-neutral-700'}`}>Raccourcis</h3>
                </div>
                <div className="space-y-2">
                  {SHORTCUTS.map(s => (
                    <div key={s.keys} className="flex items-center justify-between">
                      <span className={`text-sm ${isDark ? 'text-zinc-400' : 'text-neutral-500'}`}>{s.desc}</span>
                      <kbd className={`px-2 py-0.5 rounded text-xs font-mono ${
                        isDark
                          ? 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                          : 'bg-neutral-100 text-neutral-600 border border-neutral-200'
                      }`}>
                        {s.keys}
                      </kbd>
                    </div>
                  ))}
                </div>
              </section>

              {/* FAQ */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <HelpCircle className="w-4 h-4 text-emerald-400" />
                  <h3 className={`text-sm font-semibold ${isDark ? 'text-zinc-200' : 'text-neutral-700'}`}>FAQ</h3>
                </div>
                <div className="space-y-3">
                  {FAQ.map((item, i) => (
                    <div key={i} className={`rounded-lg p-3 ${isDark ? 'bg-zinc-900/40' : 'bg-neutral-50'}`}>
                      <p className={`text-sm font-medium mb-1 ${isDark ? 'text-zinc-200' : 'text-neutral-700'}`}>{item.q}</p>
                      <p className={`text-xs leading-relaxed ${isDark ? 'text-zinc-400' : 'text-neutral-400'}`}>{item.a}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Dismiss */}
              <div className="pt-2 pb-4">
                <button
                  onClick={handleDismiss}
                  className={`w-full text-center py-2.5 rounded-xl text-sm transition-colors ${
                    isDark
                      ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400'
                      : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-500'
                  }`}
                >
                  Ne plus afficher
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
