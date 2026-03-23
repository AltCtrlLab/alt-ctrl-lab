'use client';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import type { PortfolioItem } from '@/lib/db/schema_portfolio';
import { PortfolioTypeBadge } from './PortfolioTypeBadge';
import { ResultsDisplay } from './ResultsDisplay';

interface Props {
  item: PortfolioItem;
  onClick: () => void;
  index: number;
}

export function PortfolioCard({ item, onClick, index }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl overflow-hidden cursor-pointer transition-all group focus-visible:ring-2 focus-visible:ring-fuchsia-500/50 focus-visible:outline-none"
    >
      {item.coverUrl ? (
        <div className="h-40 bg-zinc-800 overflow-hidden">
          <img src={item.coverUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        </div>
      ) : (
        <div className="h-40 bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
          <span className="text-zinc-400 text-4xl font-bold">{item.clientName.charAt(0)}</span>
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-sm font-semibold text-zinc-100 line-clamp-1 flex-1 mr-2">{item.title}</h3>
          {Boolean(item.featured) && <Star className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0 fill-yellow-400" />}
        </div>
        <p className="text-xs text-zinc-400 mb-2">{item.clientName}</p>
        <div className="flex items-center gap-2 mb-3">
          <PortfolioTypeBadge type={item.projectType as any} />
          {!Boolean(item.published) && <span className="text-[10px] text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded">Brouillon</span>}
        </div>
        <ResultsDisplay results={item.results} />
      </div>
    </motion.div>
  );
}
