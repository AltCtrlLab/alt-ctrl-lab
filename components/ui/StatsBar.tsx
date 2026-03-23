'use client';

import { motion } from 'framer-motion';
import { CountUp } from './CountUp';

export interface StatItem {
  /** Label displayed below the value */
  label: string;
  /** Numeric value (animated with CountUp) or pre-formatted string */
  value: number | string;
  /** Icon component from lucide-react */
  icon: React.ElementType;
  /** Tailwind color class for the icon and value (e.g. "text-emerald-400") */
  color: string;
  /** Suffix after number (e.g. "%", " €") — only used when value is number */
  suffix?: string;
  /** Prefix before number (e.g. "$") — only used when value is number */
  prefix?: string;
  /** Decimal places for CountUp */
  decimals?: number;
  /** Small secondary text below label */
  sub?: string;
  /** When true and value > 0, card shows rose/alert styling */
  alert?: boolean;
}

interface StatsBarProps {
  /** Array of stat items to display */
  items: StatItem[];
  /** Grid columns at md breakpoint (defaults to items.length) */
  columns?: number;
  /** Show loading skeleton (pass null stats from parent) */
  loading?: boolean;
  /** Extra class on container */
  className?: string;
}

/**
 * Generic stats bar — replaces 7 domain-specific StatsBar components.
 * Supports both numeric (animated) and pre-formatted string values.
 */
export function StatsBar({ items, columns, loading, className = '' }: StatsBarProps) {
  const cols = columns ?? items.length;
  const gridCls = `grid grid-cols-2 md:grid-cols-${cols} gap-3 ${className}`;

  if (loading) {
    return (
      <div className={gridCls}>
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-white/[0.03] border border-white/[0.08] animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className={gridCls}>
      {items.map((item, i) => {
        const Icon = item.icon;
        const isAlert = item.alert && typeof item.value === 'number' && item.value > 0;
        const isNumeric = typeof item.value === 'number';

        return (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 ${
              isAlert
                ? 'bg-rose-500/5 border-rose-500/20'
                : 'bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.05]'
            }`}
          >
            <div className={`p-2.5 rounded-lg flex-shrink-0 ${item.color.replace('text-', 'bg-').replace(/\d00$/, '500/20')} ${item.color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className={`text-2xl font-bold ${isAlert ? 'text-rose-400' : 'text-zinc-100'}`}>
                {isNumeric ? (
                  <CountUp
                    value={item.value as number}
                    suffix={item.suffix}
                    prefix={item.prefix}
                    decimals={item.decimals}
                  />
                ) : (
                  item.value
                )}
              </p>
              <p className="text-xs text-zinc-400 mt-0.5 truncate">{item.label}</p>
              {item.sub && <p className="text-[10px] text-zinc-400 mt-0.5">{item.sub}</p>}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
