'use client';

import React, { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Sparkles, Compass, Keyboard, HelpCircle,
  LayoutDashboard, TrendingUp, FolderKanban, Wallet,
  CalendarDays, Workflow, Terminal, Target, HeartHandshake,
} from 'lucide-react';

interface GuidePanelProps {
  open: boolean;
  onClose: () => void;
  isDark: boolean;
}

const NAV_ITEMS = [
  { label: 'Dashboard', icon: LayoutDashboard, desc: 'Vue d\'ensemble avec KPIs et activite recente' },
  { label: 'Leads', icon: TrendingUp, desc: 'Pipeline commercial : du prospect au client signe' },
  { label: 'Projets', icon: FolderKanban, desc: 'Suivi des projets en cours avec phases et deadlines' },
  { label: 'Finances', icon: Wallet, desc: 'Factures, depenses et tresorerie' },
  { label: 'Content', icon: CalendarDays, desc: 'Calendrier editorial et gestion de contenu' },
  { label: 'Automations', icon: Workflow, desc: 'Workflows n8n et automatisations actives' },
  { label: 'Prospection', icon: Target, desc: 'Prospection froide et outreach automatise' },
  { label: 'Post-Vente', icon: HeartHandshake, desc: 'Suivi post-projet, NPS et relances' },
  { label: 'Cockpit Ops', icon: Terminal, desc: 'Centre de controle avance des agents IA' },
];

const SHORTCUTS = [
  { keys: 'Ctrl + K', desc: 'Recherche globale' },
  { keys: 'Ctrl + B', desc: 'Nouveau brief' },
  { keys: 'Theme', desc: 'Toggle clair/sombre via la sidebar' },
];

const FAQ = [
  { q: 'Comment creer un nouveau projet ?', a: 'Depuis la page Leads, passez un lead au statut "Signe" — un projet et une facture seront crees automatiquement.' },
  { q: 'Comment fonctionnent les agents IA ?', a: 'Chaque agent a une specialite (dev, marketing, branding). Envoyez un brief depuis la page Brief et les agents traitent votre demande.' },
  { q: 'Comment connecter n8n ?', a: 'Les workflows n8n sont configures dans la page Automations. Les webhooks synchronisent automatiquement les donnees.' },
  { q: 'Ou voir l\'historique des taches ?', a: 'La page History affiche toutes les executions passees des agents avec leur statut.' },
];

export function GuidePanel({ open, onClose, isDark }: GuidePanelProps) {
  const handleDismiss = useCallback(() => {
    localStorage.setItem('acl-guide-dismissed', '1');
    onClose();
  }, [onClose]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

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
            <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-cyan-400" />
                <h2 className={`text-sm font-semibold ${isDark ? 'text-zinc-100' : 'text-neutral-800'}`}>
                  Guide AltCtrl.Lab
                </h2>
              </div>
              <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors">
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
                  Ce cockpit centralise toutes les operations d'AltCtrl.Lab. Leads, projets, finances,
                  contenu et automatisations sont geres depuis une interface unique. Les agents IA
                  traitent les taches en arriere-plan pendant que tu supervises.
                </p>
              </section>

              {/* Navigation */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Compass className="w-4 h-4 text-fuchsia-400" />
                  <h3 className={`text-sm font-semibold ${isDark ? 'text-zinc-200' : 'text-neutral-700'}`}>Navigation</h3>
                </div>
                <div className="space-y-1.5">
                  {NAV_ITEMS.map(item => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.label}
                        className={`flex items-start gap-3 px-3 py-2 rounded-lg ${isDark ? 'bg-zinc-900/40' : 'bg-neutral-50'}`}
                      >
                        <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${isDark ? 'text-zinc-500' : 'text-neutral-400'}`} />
                        <div>
                          <p className={`text-sm font-medium ${isDark ? 'text-zinc-300' : 'text-neutral-700'}`}>{item.label}</p>
                          <p className={`text-xs ${isDark ? 'text-zinc-600' : 'text-neutral-400'}`}>{item.desc}</p>
                        </div>
                      </div>
                    );
                  })}
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
                      <p className={`text-xs leading-relaxed ${isDark ? 'text-zinc-500' : 'text-neutral-400'}`}>{item.a}</p>
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
