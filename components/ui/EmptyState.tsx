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
  fuchsia: {
    iconBg: 'bg-fuchsia-500/10',
    iconBorder: 'border-fuchsia-500/20',
    iconText: 'text-fuchsia-400',
    btnBg: 'bg-fuchsia-600/20 hover:bg-fuchsia-600/30',
    btnBorder: 'border-fuchsia-500/30',
    btnText: 'text-fuchsia-300',
  },
  cyan: {
    iconBg: 'bg-cyan-500/10',
    iconBorder: 'border-cyan-500/20',
    iconText: 'text-cyan-400',
    btnBg: 'bg-cyan-600/20 hover:bg-cyan-600/30',
    btnBorder: 'border-cyan-500/30',
    btnText: 'text-cyan-300',
  },
  zinc: {
    iconBg: 'bg-zinc-800',
    iconBorder: 'border-zinc-700',
    iconText: 'text-zinc-400',
    btnBg: 'bg-zinc-800 hover:bg-zinc-700',
    btnBorder: 'border-zinc-700',
    btnText: 'text-zinc-300',
  },
};

export function EmptyState({ icon: Icon, color, message, submessage, ctaLabel, onAction }: EmptyStateProps) {
  const c = COLOR_MAP[color] ?? COLOR_MAP.fuchsia;

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
