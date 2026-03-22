'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface ShortcutsOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { section: 'Global', items: [
    { keys: ['⌘', 'K'], desc: 'Palette de Commandes' },
    { keys: ['?'], desc: 'Raccourcis clavier' },
    { keys: ['[', ']'], desc: 'Basculer barre latérale' },
  ]},
  { section: 'Navigation', items: [
    { keys: ['1'], desc: 'Centre Ops' },
    { keys: ['2'], desc: 'Contrôle Briefs' },
    { keys: ['3'], desc: 'Effectif Équipe' },
    { keys: ['4'], desc: 'Activité' },
    { keys: ['5'], desc: 'Tableau Kanban' },
    { keys: ['6'], desc: 'Labo R&D' },
    { keys: ['7'], desc: 'La Voûte' },
    { keys: ['8'], desc: 'Réglages' },
  ]},
];

export function ShortcutsOverlay({ isOpen, onClose }: ShortcutsOverlayProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-neutral-900/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl w-full max-w-md p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">Raccourcis clavier</h2>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-neutral-500">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-6">
              {SHORTCUTS.map(section => (
                <div key={section.section}>
                  <p className="text-[10px] uppercase tracking-widest text-neutral-600 font-medium mb-2">{section.section}</p>
                  <div className="space-y-1.5">
                    {section.items.map(item => (
                      <div key={item.desc} className="flex items-center justify-between py-1.5">
                        <span className="text-sm text-neutral-300">{item.desc}</span>
                        <div className="flex gap-1">
                          {item.keys.map(k => (
                            <kbd key={k} className="min-w-[24px] h-6 flex items-center justify-center rounded bg-white/[0.06] text-[11px] text-neutral-400 font-mono px-1.5">
                              {k}
                            </kbd>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
