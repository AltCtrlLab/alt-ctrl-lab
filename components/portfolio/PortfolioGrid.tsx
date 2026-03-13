'use client';
import type { PortfolioItem } from '@/lib/db/schema_portfolio';
import { PortfolioCard } from './PortfolioCard';

interface Props {
  items: PortfolioItem[];
  onSelect: (item: PortfolioItem) => void;
}

export function PortfolioGrid({ items, onSelect }: Props) {
  if (items.length === 0) {
    return <p className="text-zinc-500 text-sm text-center py-12">Aucun projet dans le portfolio</p>;
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((item, i) => (
        <PortfolioCard key={item.id} item={item} onClick={() => onSelect(item)} index={i} />
      ))}
    </div>
  );
}
