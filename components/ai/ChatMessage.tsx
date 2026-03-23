'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { AIResponseRenderer } from './AIResponseRenderer';
import { formatRelativeTime } from '@/lib/utils';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
}

export function ChatMessage({ role, content, createdAt }: ChatMessageProps) {
  const shouldReduce = useReducedMotion();

  if (role === 'user') {
    return (
      <motion.div
        initial={shouldReduce ? {} : { opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="flex justify-end"
      >
        <div className="max-w-[85%] px-4 py-2.5 rounded-2xl rounded-br-md bg-fuchsia-500/15 border border-fuchsia-500/20">
          <p className="text-[13px] text-zinc-100 leading-relaxed whitespace-pre-wrap">{content}</p>
          <span className="block text-[10px] text-zinc-500 mt-1 text-right">{formatRelativeTime(createdAt)}</span>
        </div>
      </motion.div>
    );
  }

  // Assistant — Kodee-style system response (no bubble)
  return (
    <motion.div
      initial={shouldReduce ? {} : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="py-2"
    >
      <AIResponseRenderer content={content} />
      <span className="block text-[10px] text-zinc-500 mt-2">{formatRelativeTime(createdAt)}</span>
    </motion.div>
  );
}
