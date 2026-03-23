'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { BottomSheet } from './BottomSheet';

interface AdaptiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
  initialSnap?: 'half' | 'full';
  /** Max width on desktop (default: max-w-2xl) */
  maxWidth?: string;
  /** Show default header with title + close button (default: true) */
  showHeader?: boolean;
}

export function AdaptiveModal({
  isOpen,
  onClose,
  title,
  children,
  className = '',
  initialSnap = 'full',
  maxWidth = 'max-w-2xl',
  showHeader = true,
}: AdaptiveModalProps) {
  const isMobile = useIsMobile();
  const trapRef = useFocusTrap(isOpen && !isMobile, onClose);

  // Mobile → BottomSheet
  if (isMobile) {
    return (
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        title={showHeader ? title : undefined}
        initialSnap={initialSnap}
      >
        <div className={`p-4 ${className}`}>{children}</div>
      </BottomSheet>
    );
  }

  // Desktop → centered modal (existing pattern)
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            ref={trapRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2 }}
            className={`w-full ${maxWidth} max-h-[90vh] flex flex-col bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden ${className}`}
          >
            {showHeader && (
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 flex-shrink-0">
                <h2 className="text-base font-bold text-zinc-100 truncate">{title}</h2>
                <button
                  onClick={onClose}
                  aria-label="Fermer"
                  className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className="flex-1 overflow-y-auto">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default AdaptiveModal;
