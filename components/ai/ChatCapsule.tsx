'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { MessageSquare } from 'lucide-react';
import { ChatPanel } from './ChatPanel';

export function ChatCapsule() {
  const shouldReduce = useReducedMotion();
  const [isOpen, setIsOpen] = useState(false);
  const [hasBeenUsed, setHasBeenUsed] = useState(false);
  const [pulseCount, setPulseCount] = useState(0);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setHasBeenUsed(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleMinimize = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Keyboard shortcut: Ctrl+J to toggle
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'j') {
        e.preventDefault();
        setIsOpen(prev => {
          if (!prev) setHasBeenUsed(true);
          return !prev;
        });
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Pulse animation every 30s if never used
  useEffect(() => {
    if (hasBeenUsed || isOpen) return;
    const interval = setInterval(() => {
      setPulseCount(c => c + 1);
    }, 30_000);
    return () => clearInterval(interval);
  }, [hasBeenUsed, isOpen]);

  return (
    <>
      {/* Capsule button */}
      <motion.button
        onClick={handleOpen}
        aria-label="Ouvrir le chat avec AbdulHakim (Ctrl+J)"
        aria-expanded={isOpen}
        initial={shouldReduce ? {} : { opacity: 0, y: 16 }}
        animate={{
          opacity: 1,
          y: 0,
          scale: !hasBeenUsed && pulseCount > 0 && !shouldReduce ? [1, 1.05, 1] : 1,
        }}
        transition={
          !hasBeenUsed && pulseCount > 0
            ? { scale: { duration: 0.6, ease: 'easeInOut' } }
            : { delay: 0.6, duration: 0.4 }
        }
        whileTap={{ scale: 0.92 }}
        className={`fixed bottom-24 right-6 z-30 hidden md:flex items-center justify-center w-14 h-14 rounded-full bg-zinc-950/90 backdrop-blur-xl border border-white/[0.1] shadow-2xl hover:border-fuchsia-500/30 transition-colors ${
          isOpen ? 'opacity-0 pointer-events-none' : ''
        }`}
        style={{
          boxShadow: '0 0 20px rgba(217, 70, 239, 0.12), 0 8px 32px rgba(0, 0, 0, 0.4)',
        }}
      >
        <MessageSquare className="w-5 h-5 text-fuchsia-400" />
      </motion.button>

      {/* Chat panel */}
      <ChatPanel isOpen={isOpen} onClose={handleClose} onMinimize={handleMinimize} />
    </>
  );
}
