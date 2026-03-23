'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence, type PanInfo } from 'framer-motion';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useBottomSheet, type SnapPoint } from '@/hooks/useBottomSheet';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  initialSnap?: 'half' | 'full';
}

const SNAP_VH: Record<SnapPoint, number> = {
  closed: 0,
  half: 50,
  full: 95,
};

export function BottomSheet({ isOpen, onClose, children, title, initialSnap = 'half' }: BottomSheetProps) {
  const sheet = useBottomSheet(onClose);
  const trapRef = useFocusTrap(isOpen, onClose);

  // Sync open/close with parent
  useEffect(() => {
    if (isOpen && !sheet.isOpen) {
      sheet.open(initialSnap);
    } else if (!isOpen && sheet.isOpen) {
      sheet.close();
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Body scroll lock
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    sheet.handleDragEnd(info.velocity.y, info.offset.y);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            ref={trapRef}
            role="dialog"
            aria-modal="true"
            aria-label={title ?? 'Panneau'}
            tabIndex={-1}
            initial={{ y: '100%' }}
            animate={{ y: `${100 - SNAP_VH[sheet.snapPoint]}%` }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.1}
            onDragEnd={handleDragEnd}
            className="fixed bottom-0 left-0 right-0 z-50 flex flex-col bg-zinc-950 rounded-t-2xl border-t border-white/10 shadow-2xl"
            style={{ maxHeight: '95vh' }}
          >
            {/* Drag handle */}
            <div className="flex justify-center py-3 cursor-grab active:cursor-grabbing" style={{ touchAction: 'none' }}>
              <div className="w-8 h-1 rounded-full bg-zinc-600" aria-hidden="true" />
            </div>

            {/* Title bar */}
            {title && (
              <div className="px-4 pb-3 border-b border-white/[0.08]">
                <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default BottomSheet;
