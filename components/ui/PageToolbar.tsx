'use client';

import { Search, RotateCcw, Download, Plus } from 'lucide-react';

// ─── Sub-components ────────────────────────────────────────────────────

interface SearchInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

function ToolbarSearch({ value, onChange, placeholder = 'Rechercher...' }: SearchInputProps) {
  return (
    <div className="relative flex-1 min-w-[200px] max-w-xs">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-3 py-2 text-sm bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:border-fuchsia-500/50 focus:ring-1 focus:ring-fuchsia-500/20 transition-all"
      />
    </div>
  );
}

// ─── Select Filter ─────────────────────────────────────────────────────

export interface SelectFilter {
  type: 'select';
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: readonly string[] | { value: string; label: string }[];
}

// ─── Pill Filter ───────────────────────────────────────────────────────

export interface PillFilter {
  type: 'pill';
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  allLabel?: string;
}

export type FilterDef = SelectFilter | PillFilter;

// ─── View Toggle ───────────────────────────────────────────────────────

export interface ViewOption {
  key: string;
  label: string;
  icon: React.ElementType;
}

// ─── Action Button ─────────────────────────────────────────────────────

export interface ActionButton {
  label: string;
  icon?: React.ElementType;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  color?: string;
}

// ─── Main Props ────────────────────────────────────────────────────────

interface PageToolbarProps {
  /** Search input (omit to hide) */
  search?: SearchInputProps;
  /** Dropdown or pill filters */
  filters?: FilterDef[];
  /** Item count to display */
  count?: { value: number; label: string };
  /** View mode toggle */
  viewToggle?: {
    current: string;
    onChange: (v: string) => void;
    options: ViewOption[];
  };
  /** CSV export button */
  onExport?: () => void;
  /** Primary create button */
  createButton?: ActionButton;
  /** Extra action buttons */
  actions?: ActionButton[];
  /** Extra class on container */
  className?: string;
}

const SELECT_CLS = 'text-xs bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-400 focus:outline-none focus:border-fuchsia-500/50 cursor-pointer';

/**
 * Composable page toolbar — replaces 7 domain-specific Toolbar components.
 * All sections are optional; only renders what's provided.
 */
export function PageToolbar({
  search,
  filters,
  count,
  viewToggle,
  onExport,
  createButton,
  actions,
  className = '',
}: PageToolbarProps) {
  const hasActiveFilters = filters?.some(f => f.value !== '');

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      {/* Search */}
      {search && <ToolbarSearch {...search} />}

      {/* Filters */}
      {filters?.map((f, i) => {
        if (f.type === 'select') {
          const opts = f.options.map(o => (typeof o === 'string' ? { value: o, label: o } : o));
          return (
            <select
              key={i}
              value={f.value}
              onChange={e => f.onChange(e.target.value)}
              className={SELECT_CLS}
            >
              <option value="">{f.placeholder}</option>
              {opts.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          );
        }

        // Pill filter
        return (
          <div key={i} className="flex items-center gap-2">
            {['' as string, ...f.options].map(opt => (
              <button
                key={opt}
                onClick={() => f.onChange(opt)}
                className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                  f.value === opt ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-300'
                }`}
              >
                {opt === '' ? (f.allLabel ?? 'Tous') : opt}
              </button>
            ))}
          </div>
        );
      })}

      {/* Reset filters */}
      {hasActiveFilters && (
        <button
          onClick={() => filters?.forEach(f => f.onChange(''))}
          className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-300 transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          Reset
        </button>
      )}

      {/* Count */}
      {count && (
        <span className="text-xs text-zinc-400">
          {count.value} {count.label}
        </span>
      )}

      <div className="flex-1" />

      {/* Extra actions */}
      {actions?.map((action, i) => {
        const Icon = action.icon;
        return (
          <button
            key={i}
            onClick={action.onClick}
            className="flex items-center gap-1.5 px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-zinc-800 rounded-lg transition-colors"
          >
            {Icon && <Icon className="w-3.5 h-3.5" />}
            {action.label}
          </button>
        );
      })}

      {/* Export */}
      {onExport && (
        <button
          onClick={onExport}
          className="flex items-center gap-1.5 px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-zinc-800 rounded-lg transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          CSV
        </button>
      )}

      {/* View toggle */}
      {viewToggle && (
        <div className="flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-lg">
          {viewToggle.options.map(opt => {
            const VIcon = opt.icon;
            return (
              <button
                key={opt.key}
                onClick={() => viewToggle.onChange(opt.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  viewToggle.current === opt.key ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-300'
                }`}
              >
                <VIcon className="w-3.5 h-3.5" />
                {opt.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Create button */}
      {createButton && (
        <button
          onClick={createButton.onClick}
          className={`flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors ${
            createButton.color ?? 'bg-fuchsia-600 hover:bg-fuchsia-500'
          }`}
        >
          {createButton.icon ? <createButton.icon className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {createButton.label}
        </button>
      )}
    </div>
  );
}
