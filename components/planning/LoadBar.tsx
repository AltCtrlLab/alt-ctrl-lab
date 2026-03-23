'use client';
import { motion } from 'framer-motion';

interface Props {
  percent: number;
  className?: string;
}

export function LoadBar({ percent, className = '' }: Props) {
  const color = percent < 70 ? 'bg-emerald-500' : percent < 90 ? 'bg-amber-500' : 'bg-rose-500';
  const capped = Math.min(100, percent);

  return (
    <div className={`h-2 bg-zinc-800 rounded-full overflow-hidden ${className}`} role="progressbar" aria-valuenow={capped} aria-valuemin={0} aria-valuemax={100} aria-label={`Charge: ${capped}%`}>
      <motion.div
        className={`h-full rounded-full ${color}`}
        initial={{ width: 0 }}
        animate={{ width: `${capped}%` }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />
    </div>
  );
}
