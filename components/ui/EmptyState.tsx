'use client';

import React from 'react';

interface EmptyStateProps {
  icon: React.ElementType;
  color: string;
  message: string;
  submessage?: string;
  ctaLabel?: string;
  onAction?: () => void;
}

const COLOR_MAP: Record<string, { iconBg: string; iconBorder: string; iconText: string; btnBg: string; btnBorder: string; btnText: string }> = {
  emerald: {
    iconBg: 'bg-emerald-500/10',
    iconBorder: 'border-emerald-500/20',
    iconText: 'text-emerald-400',
    btnBg: 'bg-emerald-600/20 hover:bg-emerald-600/30',
    btnBorder: 'border-emerald-500/30',
    btnText: 'text-emerald-300',
  },
  amber: {
    iconBg: 'bg-amber-500/10',
    iconBorder: 'border-amber-500/20',
    iconText: 'text-amber-400',
    btnBg: 'bg-amber-600/20 hover:bg-amber-600/30',
    btnBorder: 'border-amber-500/30',
    btnText: 'text-amber-300',
  },
  cyan: {
    iconBg: 'bg-cyan-500/10',
    iconBorder: 'border-cyan-500/20',
    iconText: 'text-cyan-400',
    btnBg: 'bg-cyan-600/20 hover:bg-cyan-600/30',
    btnBorder: 'border-cyan-500/30',
    btnText: 'text-cyan-300',
  },
  pink: {
    iconBg: 'bg-pink-500/10',
    iconBorder: 'border-pink-500/20',
    iconText: 'text-pink-400',
    btnBg: 'bg-pink-600/20 hover:bg-pink-600/30',
    btnBorder: 'border-pink-500/30',
    btnText: 'text-pink-300',
  },
  violet: {
    iconBg: 'bg-violet-500/10',
    iconBorder: 'border-violet-500/20',
    iconText: 'text-violet-400',
    btnBg: 'bg-violet-600/20 hover:bg-violet-600/30',
    btnBorder: 'border-violet-500/30',
    btnText: 'text-violet-300',
  },
};

export function EmptyState({ icon: Icon, color, message, submessage, ctaLabel, onAction }: EmptyStateProps) {
  const c = COLOR_MAP[color] ?? COLOR_MAP.violet;

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className={`w-12 h-12 rounded-xl ${c.iconBg} border ${c.iconBorder} flex items-center justify-center mb-4`}>
        <Icon className={`w-6 h-6 ${c.iconText}`} />
      </div>
      <p className="text-zinc-400 text-sm mb-1">{message}</p>
      {submessage && <p className="text-zinc-600 text-xs mb-4">{submessage}</p>}
      {ctaLabel && onAction && (
        <button
          onClick={onAction}
          className={`mt-3 px-4 py-2 ${c.btnBg} border ${c.btnBorder} ${c.btnText} rounded-lg text-xs font-medium transition-colors`}
        >
          {ctaLabel}
        </button>
      )}
    </div>
  );
}
