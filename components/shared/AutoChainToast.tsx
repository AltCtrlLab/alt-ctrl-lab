'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, X, ChevronRight } from 'lucide-react';

interface AutoChainToastProps {
  actions: string[];
  onClose: () => void;
}

export function AutoChainToast({ actions, onClose }: AutoChainToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, 6000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-[9999] max-w-sm bg-zinc-900 border border-emerald-500/30 rounded-xl shadow-2xl shadow-emerald-900/20 p-4"
        >
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-zinc-100">
                {actions.length} action{actions.length > 1 ? 's' : ''} automatique{actions.length > 1 ? 's' : ''} déclenchée{actions.length > 1 ? 's' : ''}
              </p>
              <div className="mt-1.5 space-y-1">
                {actions.map((action, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs text-zinc-400">
                    <ChevronRight className="w-3 h-3 text-emerald-500 shrink-0" />
                    {action}
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={() => { setVisible(false); setTimeout(onClose, 300); }}
              className="text-zinc-400 hover:text-zinc-300 transition-colors"
              aria-label="Fermer la notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
