'use client';
import type { ContentItem } from '@/lib/db/schema_content';
import { motion } from 'framer-motion';
import { Images } from 'lucide-react';
import { ContentStatusBadge } from './ContentStatusBadge';
import { PlatformIcon } from './PlatformIcon';

interface Props {
  item: ContentItem;
  onClick: () => void;
}

export function ContentCard({ item, onClick }: Props) {
  return (
    <motion.div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      draggable
      whileTap={{ scale: 0.98 }}
      className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 cursor-pointer hover:border-zinc-700 transition-colors mb-2 focus-visible:ring-2 focus-visible:ring-fuchsia-500/50 focus-visible:outline-none"
    >
      <p className="text-sm text-zinc-100 font-medium line-clamp-2 mb-2">{item.title}</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <PlatformIcon platform={item.platform as any} className="w-3.5 h-3.5" />
          <span className="text-[10px] text-zinc-400">{item.type}</span>
          {item.type === 'Carousel' && item.imagePaths && (() => {
            const paths: string[] = JSON.parse(item.imagePaths as string);
            return paths.length > 0 ? (
              <span className="flex items-center gap-0.5 text-[10px] text-cyan-400 bg-cyan-900/30 px-1.5 py-0.5 rounded">
                <Images className="w-3 h-3" />
                {paths.length}
              </span>
            ) : null;
          })()}
        </div>
        {item.agent !== 'manuel' && (
          <span className="text-[10px] text-fuchsia-400 bg-fuchsia-900/30 px-1.5 py-0.5 rounded">{item.agent}</span>
        )}
      </div>
      {item.scheduledAt && (
        <p className="text-[10px] text-zinc-400 mt-1.5">
          {new Date(item.scheduledAt).toLocaleDateString('fr-FR')}
        </p>
      )}
    </motion.div>
  );
}
