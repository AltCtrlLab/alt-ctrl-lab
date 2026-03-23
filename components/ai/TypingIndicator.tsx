'use client';

import { motion, useReducedMotion } from 'framer-motion';

export function TypingIndicator() {
  const shouldReduce = useReducedMotion();

  if (shouldReduce) {
    return (
      <div className="flex items-center gap-1.5 py-3 px-1">
        <span className="text-xs text-zinc-400">AbdulHakim réfléchit...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 py-3 px-1" aria-label="AbdulHakim est en train de répondre" role="status">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full bg-fuchsia-400/60"
          animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.15,
            ease: 'easeInOut',
          }}
        />
      ))}
      <span className="sr-only">AbdulHakim est en train de répondre</span>
    </div>
  );
}
